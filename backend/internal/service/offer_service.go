package service

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/repository"
	"baqaya-backend/internal/util"
	"gorm.io/gorm"
)

type OfferService struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewOfferService(repo *repository.Repository, cfg *config.Config) *OfferService {
	return &OfferService{repo: repo, cfg: cfg}
}

func (s *OfferService) now() time.Time {
	return time.Now().In(s.cfg.Location)
}

func defaultImageForCategory(category string) string {
	switch category {
	case "Bakery":
		return "/images/food/bakery-default.svg"
	case "Restaurant":
		return "/images/food/restaurant-default.svg"
	case "Café":
		return "/images/food/cafe-default.svg"
	case "Grocery":
		return "/images/food/grocery-default.svg"
	default:
		return "/images/food/other-default.svg"
	}
}

// CreateOffer validates and publishes a new surplus food offer for the authenticated shop owner.
func (s *OfferService) CreateOffer(ownerID uint64, req dto.CreateOfferRequest) (*dto.OfferResponse, error) {
	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &AppError{Code: http.StatusForbidden, Message: "Shop profile not found for this account."}
		}
		return nil, err
	}

	foodName, err := util.ValidateRequired(req.FoodName, "food_name", "Food name")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	category, err := util.ValidateCategory(req.Category)
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	if req.OriginalPrice <= 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "original_price", Message: "Original price must be a whole number greater than 0 IQD."}
	}
	if req.DiscountedPrice <= 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "discounted_price", Message: "Discounted price must be a whole number greater than 0 IQD."}
	}
	if req.DiscountedPrice >= req.OriginalPrice {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "discounted_price", Message: "Discounted price must be strictly less than the original price."}
	}
	if req.AvailableQuantity <= 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "available_quantity", Message: "Available quantity must be a whole number greater than 0."}
	}

	now := s.now()
	startDT, endDT, err := util.ParsePickupSchedule(req.PickupDate, req.PickupStartTime, req.PickupEndTime, now, s.cfg.Location)
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	imageURL := strings.TrimSpace(req.ImageURL)
	if imageURL == "" {
		imageURL = defaultImageForCategory(category)
	}

	offer := &models.Offer{
		ShopID:            shop.ID,
		FoodName:          foodName,
		Description:       strings.TrimSpace(req.Description),
		Category:          category,
		ImageURL:          imageURL,
		OriginalPrice:     uint(req.OriginalPrice),
		DiscountedPrice:   uint(req.DiscountedPrice),
		OriginalQuantity:  uint(req.AvailableQuantity),
		AvailableQuantity: uint(req.AvailableQuantity),
		PickupDate:        strings.TrimSpace(req.PickupDate),
		PickupStartTime:   strings.TrimSpace(req.PickupStartTime),
		PickupEndTime:     strings.TrimSpace(req.PickupEndTime),
		PickupStartAt:     startDT,
		PickupEndAt:       endDT,
		Status:            models.OfferStatusActive,
	}

	if err := s.repo.CreateOffer(offer); err != nil {
		return nil, err
	}
	offer.Shop = shop
	res := mapOffer(offer, 0)
	return &res, nil
}

// ListMarketplaceOffers returns all currently available offers (Active, qty > 0, not expired).
func (s *OfferService) ListMarketplaceOffers(search, category, sortBy string) ([]dto.OfferResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	offers, err := s.repo.ListAvailableOffers(now, search, category, sortBy)
	if err != nil {
		return nil, err
	}

	result := make([]dto.OfferResponse, 0, len(offers))
	for i := range offers {
		result = append(result, mapOffer(&offers[i], 0))
	}
	return result, nil
}

// GetMarketplaceOffer returns a single offer for customer/public viewing after syncing expiry.
func (s *OfferService) GetMarketplaceOffer(offerID uint64) (*dto.OfferResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	offer, err := s.repo.FindOfferByID(offerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	res := mapOffer(offer, 0)
	return &res, nil
}

// ListShopOffers returns all offers owned by the authenticated shop owner.
func (s *OfferService) ListShopOffers(ownerID uint64, statusFilter string) ([]dto.OfferResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	offers, err := s.repo.ListOffersByShop(shop.ID, statusFilter)
	if err != nil {
		return nil, err
	}

	countMap, err := s.repo.CountActiveReservationsMapForShop(shop.ID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.OfferResponse, 0, len(offers))
	for i := range offers {
		result = append(result, mapOffer(&offers[i], countMap[offers[i].ID]))
	}
	return result, nil
}

// GetShopOfferDetail returns a single offer owned by the authenticated shop owner.
func (s *OfferService) GetShopOfferDetail(ownerID, offerID uint64) (*dto.OfferResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	offer, err := s.repo.FindOfferByID(offerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if offer.ShopID != shop.ID {
		return nil, &AppError{Code: http.StatusForbidden, Message: "You do not have permission to view this offer."}
	}

	activeCnt, err := s.repo.CountActiveReservationsByOffer(offer.ID)
	if err != nil {
		return nil, err
	}

	res := mapOffer(offer, activeCnt)
	return &res, nil
}

// DeactivateOffer permanently marks an Active or Sold Out offer as Deactivated (FR-SHOP-04).
// Existing active reservations remain valid until pickup end time.
func (s *OfferService) DeactivateOffer(ownerID, offerID uint64) (*dto.OfferResponse, error) {
	now := s.now()
	if err := s.repo.SyncExpiries(now); err != nil {
		return nil, err
	}

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	var updatedOffer *models.Offer
	var activeCount int64

	err = s.repo.DB().Transaction(func(tx *gorm.DB) error {
		if err := repository.SyncExpiriesTx(tx, now); err != nil {
			return err
		}

		offer, err := s.repo.FindOfferForUpdateTx(tx, offerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &AppError{Code: http.StatusNotFound, Message: "Offer not found."}
			}
			return err
		}

		if offer.ShopID != shop.ID {
			return &AppError{Code: http.StatusForbidden, Message: "You do not have permission to manage this offer."}
		}
		if offer.Status == models.OfferStatusDeactivated {
			return &AppError{Code: http.StatusConflict, Message: "This offer is already deactivated."}
		}
		if offer.Status == models.OfferStatusExpired {
			return &AppError{Code: http.StatusConflict, Message: "This offer has already expired and cannot be deactivated."}
		}

		offer.Status = models.OfferStatusDeactivated
		if err := tx.Save(offer).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Reservation{}).
			Where("offer_id = ? AND status = ?", offer.ID, models.ReservationStatusActive).
			Count(&activeCount).Error; err != nil {
			return err
		}

		updatedOffer = offer
		return nil
	})
	if err != nil {
		return nil, err
	}

	res := mapOffer(updatedOffer, activeCount)
	return &res, nil
}

func mapOffer(o *models.Offer, activeResCount int64) dto.OfferResponse {
	var shopName, shopAddress, shopCategory string
	if o.Shop != nil {
		shopName = o.Shop.ShopName
		shopAddress = o.Shop.Address
		shopCategory = o.Shop.Category
	}
	img := o.ImageURL
	if strings.TrimSpace(img) == "" {
		img = defaultImageForCategory(o.Category)
	}

	// Format pickup_date cleanly as YYYY-MM-DD (MySQL DATE column may return RFC3339 string in some drivers)
	pickupDate := o.PickupDate
	if len(pickupDate) > 10 {
		pickupDate = pickupDate[:10]
	}

	return dto.OfferResponse{
		ID:                     o.ID,
		OfferCode:              o.OfferCode,
		ShopID:                 o.ShopID,
		ShopName:               shopName,
		ShopAddress:            shopAddress,
		ShopCategory:           shopCategory,
		FoodName:               o.FoodName,
		Description:            o.Description,
		Category:               o.Category,
		ImageURL:               img,
		OriginalPrice:          o.OriginalPrice,
		DiscountedPrice:        o.DiscountedPrice,
		DiscountPercent:        util.CalculateDiscountPercent(o.OriginalPrice, o.DiscountedPrice),
		OriginalQuantity:       o.OriginalQuantity,
		AvailableQuantity:      o.AvailableQuantity,
		PickupDate:             pickupDate,
		PickupStartTime:        o.PickupStartTime,
		PickupEndTime:          o.PickupEndTime,
		PickupEndAt:            o.PickupEndAt,
		Status:                 o.Status,
		ActiveReservationCount: activeResCount,
		CreatedAt:              o.CreatedAt,
	}
}
