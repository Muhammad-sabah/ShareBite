package dto

import "time"

// ---- Authentication DTOs ----

type CustomerRegisterRequest struct {
	FullName    string `json:"full_name"`
	PhoneNumber string `json:"phone_number"`
	Username    string `json:"username"`
	Password    string `json:"password"`
}

type ShopOwnerRegisterRequest struct {
	OwnerName     string `json:"owner_name"`
	ShopName      string `json:"shop_name"`
	Category      string `json:"category"`
	ContactNumber string `json:"contact_number"`
	Address       string `json:"address"`
	Username      string `json:"username"`
	Password      string `json:"password"`
}

type LoginRequest struct {
	Role     string `json:"role"` // "customer" or "shop_owner"
	Username string `json:"username"`
	Password string `json:"password"`
}

type ShopProfileResponse struct {
	ID            uint64 `json:"id"`
	ShopName      string `json:"shop_name"`
	Category      string `json:"category"`
	ContactNumber string `json:"contact_number"`
	Address       string `json:"address"`
	Description   string `json:"description"`
}

type UpdateShopProfileRequest struct {
	ContactNumber string `json:"contact_number"`
	Address       string `json:"address"`
	Description   string `json:"description"`
}

type UserProfileResponse struct {
	ID          uint64                      `json:"id"`
	Role        string                      `json:"role"`
	Username    string                      `json:"username"`
	FullName    string                      `json:"full_name"`
	PhoneNumber string                      `json:"phone_number"`
	Shop        *ShopProfileResponse        `json:"shop,omitempty"`
	Beneficiary *BeneficiaryProfileResponse `json:"beneficiary,omitempty"`
}

type AuthResponse struct {
	Token string              `json:"token"`
	User  UserProfileResponse `json:"user"`
}

// ---- Offer DTOs ----

type CreateOfferRequest struct {
	FoodName          string `json:"food_name"`
	Description       string `json:"description"`
	Category          string `json:"category"`
	ImageURL          string `json:"image_url"`
	OriginalPrice     int    `json:"original_price"`
	DiscountedPrice   int    `json:"discounted_price"`
	AvailableQuantity int    `json:"available_quantity"`
	PickupDate        string `json:"pickup_date"`
	PickupStartTime   string `json:"pickup_start_time"`
	PickupEndTime     string `json:"pickup_end_time"`
}

type OfferResponse struct {
	ID                     uint64    `json:"id"`
	OfferCode              string    `json:"offer_code"`
	ShopID                 uint64    `json:"shop_id"`
	ShopName               string    `json:"shop_name"`
	ShopAddress            string    `json:"shop_address"`
	ShopCategory           string    `json:"shop_category"`
	FoodName               string    `json:"food_name"`
	Description            string    `json:"description"`
	Category               string    `json:"category"`
	ImageURL               string    `json:"image_url"`
	OriginalPrice          uint      `json:"original_price"`
	DiscountedPrice        uint      `json:"discounted_price"`
	DiscountPercent        int       `json:"discount_percent"`
	OriginalQuantity       uint      `json:"original_quantity"`
	AvailableQuantity      uint      `json:"available_quantity"`
	PickupDate             string    `json:"pickup_date"`
	PickupStartTime        string    `json:"pickup_start_time"`
	PickupEndTime          string    `json:"pickup_end_time"`
	PickupEndAt            time.Time `json:"pickup_end_at"`
	Status                 string    `json:"status"`
	ActiveReservationCount int64     `json:"active_reservation_count,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
}

// ---- Reservation DTOs ----

type CreateReservationRequest struct {
	OfferID  uint64 `json:"offer_id"`
	Quantity int    `json:"quantity"`
}

type ReservationResponse struct {
	ID              uint64    `json:"id"`
	ReservationCode string    `json:"reservation_code"`
	CustomerID      uint64    `json:"customer_id"`
	CustomerName    string    `json:"customer_name,omitempty"`
	CustomerPhone   string    `json:"customer_phone,omitempty"`
	OfferID         uint64    `json:"offer_id"`
	OfferCode       string    `json:"offer_code"`
	FoodName        string    `json:"food_name"`
	OfferImageURL   string    `json:"offer_image_url"`
	Category        string    `json:"category"`
	ShopID          uint64    `json:"shop_id"`
	ShopName        string    `json:"shop_name"`
	ShopAddress     string    `json:"shop_address"`
	Quantity        uint      `json:"quantity"`
	UnitPrice       uint      `json:"unit_price"`
	TotalPrice      uint      `json:"total_price"`
	PickupDate      string    `json:"pickup_date"`
	PickupStartTime string    `json:"pickup_start_time"`
	PickupEndTime   string    `json:"pickup_end_time"`
	PickupEndAt     time.Time `json:"pickup_end_at"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

// ---- Shop Dashboard DTO ----

type ShopDashboardResponse struct {
	Shop               ShopProfileResponse `json:"shop"`
	ActiveOffersCount  int64               `json:"active_offers_count"`
	TotalOffersCount   int64               `json:"total_offers_count"`
	ActiveReservations int64               `json:"active_reservations_count"`
	TotalReservations  int64               `json:"total_reservations_count"`
}

// ---- Beneficiary DTOs ----

type BeneficiaryRegisterRequest struct {
	FullName         string `json:"full_name"`
	PhoneNumber      string `json:"phone_number"`
	Username         string `json:"username"`
	Password         string `json:"password"`
	BeneficiaryType  string `json:"beneficiary_type"` // Individual, Family, Charity, Shelter, Other
	OrganizationName string `json:"organization_name"`
	FamilyMembers    int    `json:"family_members"`
	Address          string `json:"address"`
	IDDocumentNumber string `json:"id_document_number"`
	Notes            string `json:"notes"`
}

type BeneficiaryProfileResponse struct {
	ID                 uint64     `json:"id"`
	UserID             uint64     `json:"user_id"`
	FullName           string     `json:"full_name"`
	PhoneNumber        string     `json:"phone_number"`
	Username           string     `json:"username"`
	BeneficiaryType    string     `json:"beneficiary_type"`
	OrganizationName   string     `json:"organization_name,omitempty"`
	FamilyMembers      uint       `json:"family_members"`
	Address            string     `json:"address"`
	IDDocumentNumber   string     `json:"id_document_number,omitempty"`
	VerificationStatus string     `json:"verification_status"`
	RejectionReason    string     `json:"rejection_reason,omitempty"`
	VerifiedBy         *uint64    `json:"verified_by,omitempty"`
	VerifiedAt         *time.Time `json:"verified_at,omitempty"`
	Source             string     `json:"source"`
	Notes              string     `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

type VerifyBeneficiaryRequest struct {
	Status          string `json:"status"` // Approved or Rejected
	RejectionReason string `json:"rejection_reason"`
}

type AdminCreateBeneficiaryRequest struct {
	FullName         string `json:"full_name"`
	PhoneNumber      string `json:"phone_number"`
	Username         string `json:"username"`
	Password         string `json:"password"`
	BeneficiaryType  string `json:"beneficiary_type"`
	OrganizationName string `json:"organization_name"`
	FamilyMembers    int    `json:"family_members"`
	Address          string `json:"address"`
	IDDocumentNumber string `json:"id_document_number"`
	Notes            string `json:"notes"`
	ApprovedDirectly bool   `json:"approved_directly"`
}

// ---- Food Donation DTOs ----

type CreateDonationRequest struct {
	FoodName          string `json:"food_name"`
	Description       string `json:"description"`
	Category          string `json:"category"`
	ImageURL          string `json:"image_url"`
	Quantity          int    `json:"quantity"`
	PickupDate        string `json:"pickup_date"`
	PickupStartTime   string `json:"pickup_start_time"`
	PickupEndTime     string `json:"pickup_end_time"`
	DeliveryAvailable bool   `json:"delivery_available"`
	DeliveryNotes     string `json:"delivery_notes"`
}

type DonationResponse struct {
	ID                uint64    `json:"id"`
	DonationCode      string    `json:"donation_code"`
	ShopID            uint64    `json:"shop_id"`
	ShopName          string    `json:"shop_name"`
	ShopAddress       string    `json:"shop_address"`
	ShopCategory      string    `json:"shop_category"`
	FoodName          string    `json:"food_name"`
	Description       string    `json:"description"`
	Category          string    `json:"category"`
	ImageURL          string    `json:"image_url"`
	Quantity          uint      `json:"quantity"`
	AvailableQuantity uint      `json:"available_quantity"`
	PickupDate        string    `json:"pickup_date"`
	PickupStartTime   string    `json:"pickup_start_time"`
	PickupEndTime     string    `json:"pickup_end_time"`
	PickupEndAt       time.Time `json:"pickup_end_at"`
	DeliveryAvailable bool      `json:"delivery_available"`
	DeliveryNotes     string    `json:"delivery_notes,omitempty"`
	Status            string    `json:"status"`
	ActiveClaimsCount int64     `json:"active_claims_count,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// ---- Donation Claim DTOs ----

type CreateClaimRequest struct {
	DonationID        uint64 `json:"donation_id"`
	Quantity          int    `json:"quantity"`
	DeliveryRequested bool   `json:"delivery_requested"`
	DeliveryAddress   string `json:"delivery_address"`
	DeliveryNotes     string `json:"delivery_notes"`
}

type ClaimResponse struct {
	ID                uint64     `json:"id"`
	ClaimCode         string     `json:"claim_code"`
	DonationID        uint64     `json:"donation_id"`
	DonationCode      string     `json:"donation_code"`
	FoodName          string     `json:"food_name"`
	DonationImageURL  string     `json:"donation_image_url"`
	Category          string     `json:"category"`
	ShopID            uint64     `json:"shop_id"`
	ShopName          string     `json:"shop_name"`
	ShopAddress       string     `json:"shop_address"`
	BeneficiaryID     uint64     `json:"beneficiary_id"`
	BeneficiaryName   string     `json:"beneficiary_name,omitempty"`
	BeneficiaryPhone  string     `json:"beneficiary_phone,omitempty"`
	Quantity          uint       `json:"quantity"`
	DeliveryRequested bool       `json:"delivery_requested"`
	DeliveryAddress   string     `json:"delivery_address,omitempty"`
	DeliveryNotes     string     `json:"delivery_notes,omitempty"`
	Status            string     `json:"status"`
	FulfilledAt       *time.Time `json:"fulfilled_at,omitempty"`
	FulfillmentNotes  string     `json:"fulfillment_notes,omitempty"`
	PickupDate        string     `json:"pickup_date"`
	PickupStartTime   string     `json:"pickup_start_time"`
	PickupEndTime     string     `json:"pickup_end_time"`
	PickupEndAt       time.Time  `json:"pickup_end_at"`
	CreatedAt         time.Time  `json:"created_at"`
}

type FulfillClaimRequest struct {
	FulfillmentNotes string `json:"fulfillment_notes"`
}

type AdminDonationOverviewResponse struct {
	TotalBeneficiaries    int64 `json:"total_beneficiaries"`
	PendingBeneficiaries  int64 `json:"pending_beneficiaries"`
	ApprovedBeneficiaries int64 `json:"approved_beneficiaries"`
	TotalDonations        int64 `json:"total_donations"`
	ActiveDonations       int64 `json:"active_donations"`
	TotalClaims           int64 `json:"total_claims"`
	FulfilledClaims       int64 `json:"fulfilled_claims"`
}
