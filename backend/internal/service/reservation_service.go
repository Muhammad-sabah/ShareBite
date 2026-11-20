package service

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ReservationService struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewReservationService(repo *repository.Repository, cfg *config.Config) *ReservationService {
	return &ReservationService{repo: repo, cfg: cfg}
}

func (s *ReservationService) now() time.Time {
	return time.Now().In(s.cfg.Location)
}

// CreateReservation reserves quantity inside a MySQL transaction with row-level locking
// to prevent overselling under concurrent requests (FR-CUST-03, FR-TIMER-04).
func (s *ReservationService) CreateReservation(customerID uint64, req dto.CreateReservationRequest) (*dto.ReservationResponse, error) {
	if req.OfferID == 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "offer_id", Message: "Please select a valid offer."}
	}
	if req.Quantity <= 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "quantity", Message: "Please enter a valid quantity (1 or more)."}
	}

	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	var created *models.Reservation
	var loadedOffer *models.Offer
	var loadedCustomer *models.User

	err := s.repo.DB().Transaction(func(tx *gorm.DB) error {
		if err := repository.SyncExpiriesTx(tx, now); err != nil {
			return err
		}

		offer, err := s.repo.FindOfferForUpdateTx(tx, req.OfferID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &AppError{Code: http.StatusNotFound, Message: "Offer not found."}
			}
			return err
		}

		// Independent business logic validation of pickup end time (FR-TIMER-04)
		if !offer.PickupEndAt.After(now) {
			if offer.Status == models.OfferStatusActive || offer.Status == models.OfferStatusSoldOut {
				offer.Status = models.OfferStatusExpired
				_ = tx.Save(offer).Error
			}
			return &AppError{Code: http.StatusConflict, Message: "The pickup time has passed. This offer is no longer available."}
		}

		if offer.Status != models.OfferStatusActive {
			return &AppError{Code: http.StatusConflict, Message: "This offer is no longer available for reservation."}
		}

		qty := uint(req.Quantity)
		if qty > offer.AvailableQuantity {
			return &AppError{
				Code:    http.StatusConflict,
				Field:   "quantity",
				Message: fmt.Sprintf("Only %d unit(s) available. Please enter a smaller quantity.", offer.AvailableQuantity),
			}
		}

		var cust models.User
		if err := tx.First(&cust, customerID).Error; err != nil {
			return err
		}
		if cust.Role != models.RoleCustomer {
			return &AppError{Code: http.StatusForbidden, Message: "Only customer accounts can make reservations."}
		}

		// Deduct inventory and transition to Sold Out if depleted
		offer.AvailableQuantity -= qty
		if offer.AvailableQuantity == 0 {
			offer.Status = models.OfferStatusSoldOut
		}
		if err := tx.Save(offer).Error; err != nil {
			return err
		}

		code, err := s.repo.NextReservationCodeTx(tx)
		if err != nil {
			return err
		}

		unitPrice := offer.DiscountedPrice
		totalPrice := qty * unitPrice // Always calculated by backend

		res := &models.Reservation{
			ReservationCode: code,
			CustomerID:      customerID,
			OfferID:         offer.ID,
			Quantity:        qty,
			UnitPrice:       unitPrice,
			TotalPrice:      totalPrice,
			Status:          models.ReservationStatusActive,
		}
		if err := tx.Create(res).Error; err != nil {
			return err
		}

		created = res
		loadedOffer = offer
		loadedCustomer = &cust
		return nil
	})
	if err != nil {
		return nil, err
	}

	created.Offer = loadedOffer
	created.Customer = loadedCustomer
	out := mapReservation(created, false)
	return &out, nil
}

// ListCustomerReservations returns all reservations belonging to the authenticated customer.
func (s *ReservationService) ListCustomerReservations(customerID uint64) ([]dto.ReservationResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	rows, err := s.repo.ListReservationsByCustomer(customerID)
	if err != nil {
		return nil, err
	}

	res := make([]dto.ReservationResponse, 0, len(rows))
	for i := range rows {
		res = append(res, mapReservation(&rows[i], false))
	}
	return res, nil
}

// GetCustomerReservation returns a single reservation owned by the customer.
func (s *ReservationService) GetCustomerReservation(customerID, reservationID uint64) (*dto.ReservationResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	row, err := s.repo.FindReservationByID(reservationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if row.CustomerID != customerID {
		return nil, &AppError{Code: http.StatusForbidden, Message: "You do not have permission to view this reservation."}
	}

	out := mapReservation(row, false)
	return &out, nil
}

// CancelReservation cancels an Active reservation before pickup end time and restores stock
// following Section 7 rules inside a transaction with row locking.
func (s *ReservationService) CancelReservation(customerID, reservationID uint64) (*dto.ReservationResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	var updatedRes *models.Reservation

	err := s.repo.DB().Transaction(func(tx *gorm.DB) error {
		if err := repository.SyncExpiriesTx(tx, now); err != nil {
			return err
		}

		var res models.Reservation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Customer").
			First(&res, reservationID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &AppError{Code: http.StatusNotFound, Message: "Reservation not found."}
			}
			return err
		}

		if res.CustomerID != customerID {
			return &AppError{Code: http.StatusForbidden, Message: "You do not have permission to cancel this reservation."}
		}

		offer, err := s.repo.FindOfferForUpdateTx(tx, res.OfferID)
		if err != nil {
			return err
		}

		if res.Status == models.ReservationStatusCancelled {
			return &AppError{Code: http.StatusConflict, Message: "This reservation has already been cancelled."}
		}
		if res.Status == models.ReservationStatusExpired {
			return &AppError{Code: http.StatusConflict, Message: "This reservation has expired and cannot be cancelled."}
		}
		if res.Status != models.ReservationStatusActive {
			return &AppError{Code: http.StatusConflict, Message: "This reservation cannot be cancelled."}
		}

		if !offer.PickupEndAt.After(now) {
			res.Status = models.ReservationStatusExpired
			_ = tx.Save(&res).Error
			return &AppError{Code: http.StatusConflict, Message: "The pickup time has ended. This reservation can no longer be cancelled."}
		}

		// Step 1: Mark reservation Cancelled
		res.Status = models.ReservationStatusCancelled
		if err := tx.Save(&res).Error; err != nil {
			return err
		}

		// Step 2: Restore reserved quantity to offer
		offer.AvailableQuantity += res.Quantity

		// Step 3: Sold Out recovery (only if offer was Sold Out and not expired/deactivated)
		if offer.Status == models.OfferStatusSoldOut && offer.PickupEndAt.After(now) && offer.AvailableQuantity > 0 {
			offer.Status = models.OfferStatusActive
		}
		// Note: If offer.Status == Deactivated, it MUST stay Deactivated (Section 7.2)

		if err := tx.Save(offer).Error; err != nil {
			return err
		}

		res.Offer = offer
		updatedRes = &res
		return nil
	})
	if err != nil {
		return nil, err
	}

	out := mapReservation(updatedRes, false)
	return &out, nil
}

// ---- Shop Owner Views ----

func (s *ReservationService) GetShopDashboard(ownerID uint64) (*dto.ShopDashboardResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	activeOffers, totalOffers, activeRes, totalRes, err := s.repo.ShopStats(shop.ID)
	if err != nil {
		return nil, err
	}

	return &dto.ShopDashboardResponse{
		Shop:               mapShopProfile(shop),
		ActiveOffersCount:  activeOffers,
		TotalOffersCount:   totalOffers,
		ActiveReservations: activeRes,
		TotalReservations:  totalRes,
	}, nil
}

func (s *ReservationService) ListShopReservations(ownerID uint64, statusFilter string) ([]dto.ReservationResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	rows, err := s.repo.ListReservationsByShop(shop.ID, statusFilter)
	if err != nil {
		return nil, err
	}

	res := make([]dto.ReservationResponse, 0, len(rows))
	for i := range rows {
		res = append(res, mapReservation(&rows[i], true))
	}
	return res, nil
}

func (s *ReservationService) GetShopReservationDetail(ownerID, reservationID uint64) (*dto.ReservationResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	row, err := s.repo.FindReservationByID(reservationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if row.Offer == nil || row.Offer.ShopID != shop.ID {
		return nil, &AppError{Code: http.StatusForbidden, Message: "You do not have permission to view this reservation."}
	}

	out := mapReservation(row, true)
	return &out, nil
}

func mapReservation(r *models.Reservation, includeCustomerContact bool) dto.ReservationResponse {
	res := dto.ReservationResponse{
		ID:              r.ID,
		ReservationCode: r.ReservationCode,
		CustomerID:      r.CustomerID,
		OfferID:         r.OfferID,
		Quantity:        r.Quantity,
		UnitPrice:       r.UnitPrice,
		TotalPrice:      r.TotalPrice,
		Status:          r.Status,
		CreatedAt:       r.CreatedAt,
	}

	if includeCustomerContact && r.Customer != nil {
		res.CustomerName = r.Customer.FullName
		res.CustomerPhone = r.Customer.PhoneNumber
	}

	if r.Offer != nil {
		pickupDate := r.Offer.PickupDate
		if len(pickupDate) > 10 {
			pickupDate = pickupDate[:10]
		}
		res.OfferCode = r.Offer.OfferCode
		res.FoodName = r.Offer.FoodName
		res.OfferImageURL = r.Offer.ImageURL
		if res.OfferImageURL == "" {
			res.OfferImageURL = defaultImageForCategory(r.Offer.Category)
		}
		res.Category = r.Offer.Category
		res.ShopID = r.Offer.ShopID
		res.PickupDate = pickupDate
		res.PickupStartTime = r.Offer.PickupStartTime
		res.PickupEndTime = r.Offer.PickupEndTime
		res.PickupEndAt = r.Offer.PickupEndAt
		if r.Offer.Shop != nil {
			res.ShopName = r.Offer.Shop.ShopName
			res.ShopAddress = r.Offer.Shop.Address
		}
	}

	return res
}
