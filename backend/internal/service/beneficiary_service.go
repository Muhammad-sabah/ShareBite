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

type BeneficiaryService struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewBeneficiaryService(repo *repository.Repository, cfg *config.Config) *BeneficiaryService {
	return &BeneficiaryService{repo: repo, cfg: cfg}
}

func (s *BeneficiaryService) ListBeneficiaries(statusFilter string) ([]dto.BeneficiaryProfileResponse, error) {
	profiles, err := s.repo.ListBeneficiaryProfiles(statusFilter)
	if err != nil {
		return nil, err
	}
	res := make([]dto.BeneficiaryProfileResponse, 0, len(profiles))
	for i := range profiles {
		res = append(res, mapBeneficiaryProfile(&profiles[i]))
	}
	return res, nil
}

func (s *BeneficiaryService) VerifyBeneficiary(profileID uint64, adminID uint64, req dto.VerifyBeneficiaryRequest) (*dto.BeneficiaryProfileResponse, error) {
	status := strings.TrimSpace(req.Status)
	if status != models.BeneficiaryStatusApproved && status != models.BeneficiaryStatusRejected {
		return nil, &AppError{Code: http.StatusBadRequest, Message: "Status must be either 'Approved' or 'Rejected'."}
	}

	reason := strings.TrimSpace(req.RejectionReason)
	if status == models.BeneficiaryStatusRejected && reason == "" {
		return nil, &AppError{Code: http.StatusBadRequest, Message: "Please provide a reason when rejecting an application."}
	}

	now := time.Now().In(s.cfg.Location)
	profile, err := s.repo.UpdateBeneficiaryVerification(profileID, status, reason, adminID, now)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	out := mapBeneficiaryProfile(profile)
	return &out, nil
}

func (s *BeneficiaryService) AdminCreateBeneficiary(adminID uint64, req dto.AdminCreateBeneficiaryRequest) (*dto.BeneficiaryProfileResponse, error) {
	fullName, err := util.ValidatePersonName(req.FullName, "full_name", "Full name")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	phone, err := util.ValidatePhone(req.PhoneNumber, "phone_number", "Phone number")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	username, err := util.ValidateUsername(req.Username)
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	if err := util.ValidatePassword(req.Password); err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	address, err := util.ValidateRequired(req.Address, "address", "Address / Location")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	bType := strings.TrimSpace(req.BeneficiaryType)
	if bType == "" {
		bType = "Individual"
	}

	familyMembers := req.FamilyMembers
	if familyMembers <= 0 {
		familyMembers = 1
	}

	if existing, err := s.repo.FindUserByRoleAndUsername(models.RoleBeneficiary, username); err == nil && existing != nil {
		return nil, &AppError{Code: http.StatusConflict, Field: "username", Message: "That beneficiary username already exists."}
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := util.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Role:         models.RoleBeneficiary,
		Username:     username,
		PasswordHash: hash,
		FullName:     fullName,
		PhoneNumber:  phone,
	}

	verStatus := models.BeneficiaryStatusApproved
	if !req.ApprovedDirectly {
		verStatus = models.BeneficiaryStatusPending
	}

	now := time.Now().In(s.cfg.Location)
	var verifiedBy *uint64
	var verifiedAt *time.Time
	if verStatus == models.BeneficiaryStatusApproved {
		verifiedBy = &adminID
		verifiedAt = &now
	}

	profile := &models.BeneficiaryProfile{
		BeneficiaryType:    bType,
		OrganizationName:   strings.TrimSpace(req.OrganizationName),
		FamilyMembers:      uint(familyMembers),
		Address:            address,
		IDDocumentNumber:   strings.TrimSpace(req.IDDocumentNumber),
		VerificationStatus: verStatus,
		VerifiedBy:         verifiedBy,
		VerifiedAt:         verifiedAt,
		Source:             "Admin Referral",
		Notes:              strings.TrimSpace(req.Notes),
	}

	if err := s.repo.CreateBeneficiaryWithProfile(user, profile); err != nil {
		return nil, err
	}

	profile.User = user
	out := mapBeneficiaryProfile(profile)
	return &out, nil
}

func (s *BeneficiaryService) GetBeneficiaryProfile(userID uint64) (*dto.BeneficiaryProfileResponse, error) {
	profile, err := s.repo.FindBeneficiaryProfileByUserID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	out := mapBeneficiaryProfile(profile)
	return &out, nil
}
