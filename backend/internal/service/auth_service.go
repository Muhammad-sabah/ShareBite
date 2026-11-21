package service

import (
	"errors"
	"net/http"
	"strings"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/repository"
	"baqaya-backend/internal/util"
	"gorm.io/gorm"
)

type AuthService struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewAuthService(repo *repository.Repository, cfg *config.Config) *AuthService {
	return &AuthService{repo: repo, cfg: cfg}
}

func (s *AuthService) RegisterCustomer(req dto.CustomerRegisterRequest) (*dto.AuthResponse, error) {
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

	if existing, err := s.repo.FindUserByRoleAndUsername(models.RoleCustomer, username); err == nil && existing != nil {
		return nil, &AppError{Code: http.StatusConflict, Field: "username", Message: "That customer username already exists."}
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := util.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Role:         models.RoleCustomer,
		Username:     username,
		PasswordHash: hash,
		FullName:     fullName,
		PhoneNumber:  phone,
	}
	if err := s.repo.CreateCustomer(user); err != nil {
		return nil, err
	}

	token, err := util.GenerateToken(s.cfg.JWTSecret, s.cfg.JWTExpiryHours, user.ID, user.Username, user.Role, 0)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User:  mapUserProfile(user),
	}, nil
}

func (s *AuthService) RegisterShopOwner(req dto.ShopOwnerRegisterRequest) (*dto.AuthResponse, error) {
	ownerName, err := util.ValidatePersonName(req.OwnerName, "owner_name", "Owner name")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	shopName, err := util.ValidateRequired(req.ShopName, "shop_name", "Shop name")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	category, err := util.ValidateCategory(req.Category)
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	contact, err := util.ValidatePhone(req.ContactNumber, "contact_number", "Contact number")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	address, err := util.ValidateRequired(req.Address, "address", "Shop address")
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

	if existing, err := s.repo.FindUserByRoleAndUsername(models.RoleShopOwner, username); err == nil && existing != nil {
		return nil, &AppError{Code: http.StatusConflict, Field: "username", Message: "That shop owner username already exists."}
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	shopExists, err := s.repo.ShopNameExists(shopName)
	if err != nil {
		return nil, err
	}
	if shopExists {
		return nil, &AppError{Code: http.StatusConflict, Field: "shop_name", Message: "A shop with that name is already registered."}
	}

	hash, err := util.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Role:         models.RoleShopOwner,
		Username:     username,
		PasswordHash: hash,
		FullName:     ownerName,
		PhoneNumber:  contact,
	}
	shop := &models.Shop{
		ShopName:      shopName,
		Category:      category,
		ContactNumber: contact,
		Address:       address,
	}
	if err := s.repo.CreateShopOwnerWithShop(user, shop); err != nil {
		return nil, err
	}

	token, err := util.GenerateToken(s.cfg.JWTSecret, s.cfg.JWTExpiryHours, user.ID, user.Username, user.Role, shop.ID)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User:  mapUserProfile(user),
	}, nil
}

func (s *AuthService) RegisterBeneficiary(req dto.BeneficiaryRegisterRequest) (*dto.AuthResponse, error) {
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

	profile := &models.BeneficiaryProfile{
		BeneficiaryType:    bType,
		OrganizationName:   strings.TrimSpace(req.OrganizationName),
		FamilyMembers:      uint(familyMembers),
		Address:            address,
		IDDocumentNumber:   strings.TrimSpace(req.IDDocumentNumber),
		VerificationStatus: models.BeneficiaryStatusPending,
		Source:             "Direct Application",
		Notes:              strings.TrimSpace(req.Notes),
	}

	if err := s.repo.CreateBeneficiaryWithProfile(user, profile); err != nil {
		return nil, err
	}

	user.BeneficiaryProfile = profile

	token, err := util.GenerateToken(s.cfg.JWTSecret, s.cfg.JWTExpiryHours, user.ID, user.Username, user.Role, 0)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User:  mapUserProfile(user),
	}, nil
}

func (s *AuthService) Login(req dto.LoginRequest) (*dto.AuthResponse, error) {
	role := strings.TrimSpace(req.Role)
	if role != models.RoleCustomer && role != models.RoleShopOwner && role != models.RoleAdmin && role != models.RoleBeneficiary {
		return nil, &AppError{Code: http.StatusBadRequest, Field: "role", Message: "Please select a valid account role."}
	}

	username := strings.TrimSpace(req.Username)
	if username == "" || req.Password == "" {
		return nil, &AppError{Code: http.StatusBadRequest, Message: "Username and password are required."}
	}

	user, err := s.repo.FindUserByRoleAndUsername(role, username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &AppError{Code: http.StatusUnauthorized, Message: "Invalid username or password."}
		}
		return nil, err
	}

	if !util.VerifyPassword(req.Password, user.PasswordHash) {
		return nil, &AppError{Code: http.StatusUnauthorized, Message: "Invalid username or password."}
	}

	var shopID uint64
	if user.Shop != nil {
		shopID = user.Shop.ID
	}

	token, err := util.GenerateToken(s.cfg.JWTSecret, s.cfg.JWTExpiryHours, user.ID, user.Username, user.Role, shopID)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User:  mapUserProfile(user),
	}, nil
}

func (s *AuthService) GetProfile(userID uint64) (*dto.UserProfileResponse, error) {
	user, err := s.repo.FindUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	res := mapUserProfile(user)
	return &res, nil
}

func (s *AuthService) UpdateShopProfile(ownerID uint64, req dto.UpdateShopProfileRequest) (*dto.ShopProfileResponse, error) {
	shop, err := s.repo.FindShopByOwnerID(ownerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	contact, err := util.ValidatePhone(req.ContactNumber, "contact_number", "Contact number")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}
	address, err := util.ValidateRequired(req.Address, "address", "Shop address")
	if err != nil {
		return nil, toAppError(http.StatusBadRequest, err)
	}

	shop.ContactNumber = contact
	shop.Address = address
	shop.Description = strings.TrimSpace(req.Description)

	if err := s.repo.UpdateShopProfile(shop); err != nil {
		return nil, err
	}

	out := mapShopProfile(shop)
	return &out, nil
}

func mapUserProfile(u *models.User) dto.UserProfileResponse {
	res := dto.UserProfileResponse{
		ID:          u.ID,
		Role:        u.Role,
		Username:    u.Username,
		FullName:    u.FullName,
		PhoneNumber: u.PhoneNumber,
	}
	if u.Shop != nil {
		sp := mapShopProfile(u.Shop)
		res.Shop = &sp
	}
	if u.BeneficiaryProfile != nil {
		bp := mapBeneficiaryProfile(u.BeneficiaryProfile)
		res.Beneficiary = &bp
	}
	return res
}

func mapBeneficiaryProfile(b *models.BeneficiaryProfile) dto.BeneficiaryProfileResponse {
	fullName := ""
	phone := ""
	username := ""
	if b.User != nil {
		fullName = b.User.FullName
		phone = b.User.PhoneNumber
		username = b.User.Username
	}
	return dto.BeneficiaryProfileResponse{
		ID:                 b.ID,
		UserID:             b.UserID,
		FullName:           fullName,
		PhoneNumber:        phone,
		Username:           username,
		BeneficiaryType:    b.BeneficiaryType,
		OrganizationName:   b.OrganizationName,
		FamilyMembers:      b.FamilyMembers,
		Address:            b.Address,
		IDDocumentNumber:   b.IDDocumentNumber,
		VerificationStatus: b.VerificationStatus,
		RejectionReason:    b.RejectionReason,
		VerifiedBy:         b.VerifiedBy,
		VerifiedAt:         b.VerifiedAt,
		Source:             b.Source,
		Notes:              b.Notes,
		CreatedAt:          b.CreatedAt,
	}
}

func mapShopProfile(s *models.Shop) dto.ShopProfileResponse {
	return dto.ShopProfileResponse{
		ID:            s.ID,
		ShopName:      s.ShopName,
		Category:      s.Category,
		ContactNumber: s.ContactNumber,
		Address:       s.Address,
		Description:   s.Description,
	}
}

func toAppError(code int, err error) error {
	var ve *util.ValidationError
	if errors.As(err, &ve) {
		return &AppError{Code: code, Field: ve.Field, Message: ve.Message}
	}
	return &AppError{Code: code, Message: err.Error()}
}
