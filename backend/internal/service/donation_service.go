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

type DonationService struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewDonationService(repo *repository.Repository, cfg *config.Config) *DonationService {
	return &DonationService{repo: repo, cfg: cfg}
}

func (s *DonationService) now() time.Time {
	return time.Now().In(s.cfg.Location)
}

func (s *DonationService) SyncDonationExpiries() error {
	return s.repo.SyncDonationExpiries(s.now())
}

// ---- Shop Owner / Donor Methods ----

func (s *DonationService) CreateDonation(ownerID uint64, req dto.CreateDonationRequest) (*dto.DonationResponse, error) {
	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &AppError{Code: http.StatusForbidden, Message: "Shop profile not found for this account."}
		}
		return nil, err
	}

	foodName, err := util.ValidateRequired(req.FoodName, "food_name", "Food donation name")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	category, err := util.ValidateCategory(req.Category)
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	if req.Quantity <= 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "quantity", Message: "Donation quantity must be greater than zero."}
	}

	startAt, endAt, err := util.ParsePickupSchedule(req.PickupDate, req.PickupStartTime, req.PickupEndTime, s.now(), s.cfg.Location)
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	img := strings.TrimSpace(req.ImageURL)
	if img == "" {
		img = defaultImageForCategory(category)
	}

	donation := models.FoodDonation{
		ShopID:            shop.ID,
		FoodName:          foodName,
		Description:       strings.TrimSpace(req.Description),
		Category:          category,
		ImageURL:          img,
		Quantity:          uint(req.Quantity),
		AvailableQuantity: uint(req.Quantity),
		PickupDate:        strings.TrimSpace(req.PickupDate),
		PickupStartTime:   strings.TrimSpace(req.PickupStartTime),
		PickupEndTime:     strings.TrimSpace(req.PickupEndTime),
		PickupStartAt:     startAt,
		PickupEndAt:       endAt,
		DeliveryAvailable: req.DeliveryAvailable,
		DeliveryNotes:     strings.TrimSpace(req.DeliveryNotes),
		Status:            models.DonationStatusActive,
	}

	if err := s.repo.CreateDonation(&donation); err != nil {
		return nil, err
	}

	donation.Shop = shop
	out := mapDonation(&donation, 0)
	return &out, nil
}

func (s *DonationService) ListShopDonations(ownerID uint64) ([]dto.DonationResponse, error) {
	_ = s.SyncDonationExpiries()

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	donations, err := s.repo.ListDonationsByShop(shop.ID)
	if err != nil {
		return nil, err
	}

	claimsMap, err := s.repo.CountActiveClaimsMapForShop(shop.ID)
	if err != nil {
		return nil, err
	}

	res := make([]dto.DonationResponse, 0, len(donations))
	for i := range donations {
		res = append(res, mapDonation(&donations[i], claimsMap[donations[i].ID]))
	}
	return res, nil
}

func (s *DonationService) GetShopDonationDetail(ownerID, donationID uint64) (*dto.DonationResponse, error) {
	_ = s.SyncDonationExpiries()

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	donation, err := s.repo.FindDonationByID(donationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if donation.ShopID != shop.ID {
		return nil, &AppError{Code: http.StatusForbidden, Message: "You do not have permission to view this donation."}
	}

	activeCount, _ := s.repo.CountActiveClaimsByDonation(donation.ID)
	out := mapDonation(donation, activeCount)
	return &out, nil
}

func (s *DonationService) CancelDonation(ownerID, donationID uint64) error {
	_ = s.SyncDonationExpiries()

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return ErrNotFound
	}

	if err := s.repo.CancelDonation(shop.ID, donationID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return &AppError{Code: http.StatusBadRequest, Message: err.Error()}
	}

	return nil
}

// ---- Beneficiary Methods ----

func (s *DonationService) ListActiveDonationsForBeneficiaries(category string) ([]dto.DonationResponse, error) {
	_ = s.SyncDonationExpiries()

	donations, err := s.repo.ListActiveDonations(s.now(), category)
	if err != nil {
		return nil, err
	}

	res := make([]dto.DonationResponse, 0, len(donations))
	for i := range donations {
		res = append(res, mapDonation(&donations[i], 0))
	}
	return res, nil
}

func (s *DonationService) GetDonationDetail(donationID uint64) (*dto.DonationResponse, error) {
	_ = s.SyncDonationExpiries()

	donation, err := s.repo.FindDonationByID(donationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	out := mapDonation(donation, 0)
	return &out, nil
}

func (s *DonationService) ClaimDonation(beneficiaryID uint64, req dto.CreateClaimRequest) (*dto.ClaimResponse, error) {
	_ = s.SyncDonationExpiries()

	// Verify beneficiary is approved
	profile, err := s.repo.FindBeneficiaryProfileByUserID(beneficiaryID)
	if err != nil || profile == nil {
		return nil, &AppError{Code: http.StatusForbidden, Message: "Beneficiary profile not found."}
	}

	if profile.VerificationStatus != models.BeneficiaryStatusApproved {
		return nil, &AppError{Code: http.StatusForbidden, Message: "Your beneficiary account is pending admin approval. You cannot claim food donations yet."}
	}

	if req.DonationID == 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Message: "Donation ID is required."}
	}

	if req.Quantity <= 0 {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "quantity", Message: "Please claim at least 1 unit."}
	}

	deliveryAddress := strings.TrimSpace(req.DeliveryAddress)
	if req.DeliveryRequested && deliveryAddress == "" {
		// Use registered beneficiary address as fallback
		deliveryAddress = profile.Address
	}

	claim, err := s.repo.CreateClaimTx(beneficiaryID, req.DonationID, uint(req.Quantity), req.DeliveryRequested, deliveryAddress, strings.TrimSpace(req.DeliveryNotes), s.now())
	if err != nil {
		return nil, &AppError{Code: http.StatusBadRequest, Message: err.Error()}
	}

	out := mapClaim(claim)
	return &out, nil
}

func (s *DonationService) ListBeneficiaryClaims(beneficiaryID uint64) ([]dto.ClaimResponse, error) {
	_ = s.SyncDonationExpiries()

	claims, err := s.repo.ListClaimsByBeneficiary(beneficiaryID)
	if err != nil {
		return nil, err
	}

	res := make([]dto.ClaimResponse, 0, len(claims))
	for i := range claims {
		res = append(res, mapClaim(&claims[i]))
	}
	return res, nil
}

func (s *DonationService) CancelBeneficiaryClaim(claimID, beneficiaryID uint64) error {
	_ = s.SyncDonationExpiries()

	if err := s.repo.CancelClaimTx(claimID, beneficiaryID, s.now()); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return &AppError{Code: http.StatusBadRequest, Message: err.Error()}
	}
	return nil
}

func (s *DonationService) ListShopClaims(ownerID uint64) ([]dto.ClaimResponse, error) {
	_ = s.SyncDonationExpiries()

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	claims, err := s.repo.ListClaimsByShop(shop.ID)
	if err != nil {
		return nil, err
	}

	res := make([]dto.ClaimResponse, 0, len(claims))
	for i := range claims {
		res = append(res, mapClaim(&claims[i]))
	}
	return res, nil
}

func (s *DonationService) FulfillClaim(ownerID, claimID uint64, req dto.FulfillClaimRequest) (*dto.ClaimResponse, error) {
	_ = s.SyncDonationExpiries()

	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		return nil, ErrNotFound
	}

	claim, err := s.repo.FulfillClaim(claimID, shop.ID, strings.TrimSpace(req.FulfillmentNotes), s.now())
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, &AppError{Code: http.StatusBadRequest, Message: err.Error()}
	}

	out := mapClaim(claim)
	return &out, nil
}

func (s *DonationService) GetAdminOverview() (*dto.AdminDonationOverviewResponse, error) {
	_ = s.SyncDonationExpiries()

	totalBen, pendingBen, approvedBen, err := s.repo.CountBeneficiariesByStatus()
	if err != nil {
		return nil, err
	}

	totalDon, activeDon, totalClaims, fulfilledClaims, err := s.repo.CountDonationStats()
	if err != nil {
		return nil, err
	}

	return &dto.AdminDonationOverviewResponse{
		TotalBeneficiaries:    totalBen,
		PendingBeneficiaries:  pendingBen,
		ApprovedBeneficiaries: approvedBen,
		TotalDonations:        totalDon,
		ActiveDonations:       activeDon,
		TotalClaims:           totalClaims,
		FulfilledClaims:       fulfilledClaims,
	}, nil
}

func (s *DonationService) ListAllDonationsForAdmin() ([]dto.DonationResponse, error) {
	_ = s.SyncDonationExpiries()
	donations, err := s.repo.ListAllDonations()
	if err != nil {
		return nil, err
	}
	res := make([]dto.DonationResponse, 0, len(donations))
	for i := range donations {
		res = append(res, mapDonation(&donations[i], 0))
	}
	return res, nil
}

func (s *DonationService) ListAllClaimsForAdmin() ([]dto.ClaimResponse, error) {
	claims, err := s.repo.ListAllClaims()
	if err != nil {
		return nil, err
	}
	res := make([]dto.ClaimResponse, 0, len(claims))
	for i := range claims {
		res = append(res, mapClaim(&claims[i]))
	}
	return res, nil
}

// ---- Mapping Helpers ----

func mapDonation(d *models.FoodDonation, activeClaims int64) dto.DonationResponse {
	shopName := ""
	shopAddress := ""
	shopCategory := ""
	if d.Shop != nil {
		shopName = d.Shop.ShopName
		shopAddress = d.Shop.Address
		shopCategory = d.Shop.Category
	}

	pickupDate := d.PickupDate
	if len(pickupDate) > 10 {
		pickupDate = pickupDate[:10]
	}

	return dto.DonationResponse{
		ID:                d.ID,
		DonationCode:      d.DonationCode,
		ShopID:            d.ShopID,
		ShopName:          shopName,
		ShopAddress:       shopAddress,
		ShopCategory:      shopCategory,
		FoodName:          d.FoodName,
		Description:       d.Description,
		Category:          d.Category,
		ImageURL:          d.ImageURL,
		Quantity:          d.Quantity,
		AvailableQuantity: d.AvailableQuantity,
		PickupDate:        pickupDate,
		PickupStartTime:   d.PickupStartTime,
		PickupEndTime:     d.PickupEndTime,
		PickupEndAt:       d.PickupEndAt,
		DeliveryAvailable: d.DeliveryAvailable,
		DeliveryNotes:     d.DeliveryNotes,
		Status:            d.Status,
		ActiveClaimsCount: activeClaims,
		CreatedAt:         d.CreatedAt,
	}
}

func mapClaim(c *models.DonationClaim) dto.ClaimResponse {
	donationCode := ""
	foodName := ""
	imageURL := ""
	category := ""
	shopID := uint64(0)
	shopName := ""
	shopAddress := ""
	pickupDate := ""
	pickupStart := ""
	pickupEnd := ""
	var pickupEndAt time.Time

	if c.Donation != nil {
		donationCode = c.Donation.DonationCode
		foodName = c.Donation.FoodName
		imageURL = c.Donation.ImageURL
		category = c.Donation.Category
		shopID = c.Donation.ShopID
		pickupDate = c.Donation.PickupDate
		if len(pickupDate) > 10 {
			pickupDate = pickupDate[:10]
		}
		pickupStart = c.Donation.PickupStartTime
		pickupEnd = c.Donation.PickupEndTime
		pickupEndAt = c.Donation.PickupEndAt

		if c.Donation.Shop != nil {
			shopName = c.Donation.Shop.ShopName
			shopAddress = c.Donation.Shop.Address
		}
	}

	benName := ""
	benPhone := ""
	if c.Beneficiary != nil {
		benName = c.Beneficiary.FullName
		benPhone = c.Beneficiary.PhoneNumber
	}

	return dto.ClaimResponse{
		ID:                c.ID,
		ClaimCode:         c.ClaimCode,
		DonationID:        c.DonationID,
		DonationCode:      donationCode,
		FoodName:          foodName,
		DonationImageURL:  imageURL,
		Category:          category,
		ShopID:            shopID,
		ShopName:          shopName,
		ShopAddress:       shopAddress,
		BeneficiaryID:     c.BeneficiaryID,
		BeneficiaryName:   benName,
		BeneficiaryPhone:  benPhone,
		Quantity:          c.Quantity,
		DeliveryRequested: c.DeliveryRequested,
		DeliveryAddress:   c.DeliveryAddress,
		DeliveryNotes:     c.DeliveryNotes,
		Status:            c.Status,
		FulfilledAt:       c.FulfilledAt,
		FulfillmentNotes:  c.FulfillmentNotes,
		PickupDate:        pickupDate,
		PickupStartTime:   pickupStart,
		PickupEndTime:     pickupEnd,
		PickupEndAt:       pickupEndAt,
		CreatedAt:         c.CreatedAt,
	}
}
