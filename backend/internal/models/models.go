package models

import "time"

// User roles
const (
	RoleCustomer    = "customer"
	RoleShopOwner   = "shop_owner"
	RoleAdmin       = "admin"
	RoleBeneficiary = "beneficiary"
)

// Beneficiary verification statuses
const (
	BeneficiaryStatusPending  = "Pending"
	BeneficiaryStatusApproved = "Approved"
	BeneficiaryStatusRejected = "Rejected"
)

// Food donation listing statuses
const (
	DonationStatusActive       = "Active"
	DonationStatusFullyClaimed = "Fully Claimed"
	DonationStatusExpired      = "Expired"
	DonationStatusCancelled    = "Cancelled"
)

// Donation claim statuses
const (
	ClaimStatusActive    = "Active"
	ClaimStatusFulfilled = "Fulfilled"
	ClaimStatusCancelled = "Cancelled"
	ClaimStatusExpired   = "Expired"
)

// Food & shop categories (approved list per Requirements Spec v1.2)
var AllowedCategories = []string{
	"Bakery",
	"Restaurant",
	"Café",
	"Grocery",
	"Other",
}

// Offer statuses (FR-LIFE-05)
const (
	OfferStatusActive      = "Active"
	OfferStatusSoldOut     = "Sold Out"
	OfferStatusExpired     = "Expired"
	OfferStatusDeactivated = "Deactivated"
)

// Reservation statuses (FR-LIFE-06)
const (
	ReservationStatusActive    = "Active"
	ReservationStatusCancelled = "Cancelled"
	ReservationStatusExpired   = "Expired"
)

// User represents either a Customer, Shop Owner, Admin, or Beneficiary account.
type User struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Role         string    `gorm:"type:enum('customer','shop_owner','admin','beneficiary');not null;uniqueIndex:uq_users_role_username;index:idx_users_role" json:"role"`
	Username     string    `gorm:"type:varchar(64);not null;uniqueIndex:uq_users_role_username" json:"username"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FullName     string    `gorm:"type:varchar(120);not null" json:"full_name"`
	PhoneNumber  string    `gorm:"type:varchar(20);not null" json:"phone_number"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Shop               *Shop               `gorm:"foreignKey:OwnerID" json:"shop,omitempty"`
	BeneficiaryProfile *BeneficiaryProfile `gorm:"foreignKey:UserID" json:"beneficiary_profile,omitempty"`
}

// Shop represents a local Sulaymaniyah business managed by one Shop Owner.
type Shop struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OwnerID       uint64    `gorm:"not null;uniqueIndex:uq_shops_owner" json:"owner_id"`
	ShopName      string    `gorm:"type:varchar(120);not null;uniqueIndex:uq_shops_shop_name" json:"shop_name"`
	Category      string    `gorm:"type:enum('Bakery','Restaurant','Café','Grocery','Other');not null;index:idx_shops_category" json:"category"`
	ContactNumber string    `gorm:"type:varchar(20);not null" json:"contact_number"`
	Address       string    `gorm:"type:varchar(255);not null" json:"address"`
	Description   string    `gorm:"type:text" json:"description"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Owner *User `gorm:"foreignKey:OwnerID" json:"-"`
}

// Offer represents a discounted surplus food listing published by a Shop.
type Offer struct {
	ID                uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OfferCode         string    `gorm:"type:varchar(20);not null;uniqueIndex:uq_offers_code" json:"offer_code"`
	ShopID            uint64    `gorm:"not null;index:idx_offers_shop_id" json:"shop_id"`
	FoodName          string    `gorm:"type:varchar(150);not null" json:"food_name"`
	Description       string    `gorm:"type:text" json:"description"`
	Category          string    `gorm:"type:enum('Bakery','Restaurant','Café','Grocery','Other');not null;index:idx_offers_category" json:"category"`
	ImageURL          string    `gorm:"type:varchar(500)" json:"image_url"`
	OriginalPrice     uint      `gorm:"not null" json:"original_price"`
	DiscountedPrice   uint      `gorm:"not null" json:"discounted_price"`
	OriginalQuantity  uint      `gorm:"not null" json:"original_quantity"`
	AvailableQuantity uint      `gorm:"not null" json:"available_quantity"`
	PickupDate        string    `gorm:"type:date;not null" json:"pickup_date"`
	PickupStartTime   string    `gorm:"type:varchar(5);not null" json:"pickup_start_time"`
	PickupEndTime     string    `gorm:"type:varchar(5);not null" json:"pickup_end_time"`
	PickupStartAt     time.Time `gorm:"not null" json:"pickup_start_at"`
	PickupEndAt       time.Time `gorm:"not null;index:idx_offers_status_end" json:"pickup_end_at"`
	Status            string    `gorm:"type:enum('Active','Sold Out','Expired','Deactivated');not null;default:'Active';index:idx_offers_status_end" json:"status"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Shop *Shop `gorm:"foreignKey:ShopID" json:"shop,omitempty"`
}

// Reservation represents a customer's cash-on-pickup food reservation.
type Reservation struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ReservationCode string    `gorm:"type:varchar(20);not null;uniqueIndex:uq_reservations_code" json:"reservation_code"`
	CustomerID      uint64    `gorm:"not null;index:idx_reservations_customer" json:"customer_id"`
	OfferID         uint64    `gorm:"not null;index:idx_reservations_offer" json:"offer_id"`
	Quantity        uint      `gorm:"not null" json:"quantity"`
	UnitPrice       uint      `gorm:"not null" json:"unit_price"`
	TotalPrice      uint      `gorm:"not null" json:"total_price"`
	Status          string    `gorm:"type:enum('Active','Cancelled','Expired');not null;default:'Active';index:idx_reservations_customer;index:idx_reservations_offer" json:"status"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Customer *User  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Offer    *Offer `gorm:"foreignKey:OfferID" json:"offer,omitempty"`
}

// BeneficiaryProfile holds the verification, household, and application details for a registered Beneficiary.
type BeneficiaryProfile struct {
	ID                 uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID             uint64     `gorm:"not null;uniqueIndex:uq_beneficiary_user_id" json:"user_id"`
	BeneficiaryType    string     `gorm:"type:enum('Individual','Family','Charity','Shelter','Other');not null;default:'Individual'" json:"beneficiary_type"`
	OrganizationName   string     `gorm:"type:varchar(150)" json:"organization_name,omitempty"`
	FamilyMembers      uint       `gorm:"not null;default:1" json:"family_members"`
	Address            string     `gorm:"type:varchar(255);not null" json:"address"`
	IDDocumentNumber   string     `gorm:"type:varchar(100)" json:"id_document_number,omitempty"`
	VerificationStatus string     `gorm:"type:enum('Pending','Approved','Rejected');not null;default:'Pending';index:idx_beneficiary_status" json:"verification_status"`
	RejectionReason    string     `gorm:"type:text" json:"rejection_reason,omitempty"`
	VerifiedBy         *uint64    `json:"verified_by,omitempty"`
	VerifiedAt         *time.Time `json:"verified_at,omitempty"`
	Source             string     `gorm:"type:enum('Direct Application','Admin Referral');not null;default:'Direct Application'" json:"source"`
	Notes              string     `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt          time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// FoodDonation represents a free surplus food donation listing published by a Shop Owner (Food Donor).
type FoodDonation struct {
	ID                uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	DonationCode      string    `gorm:"type:varchar(20);not null;uniqueIndex:uq_donations_code" json:"donation_code"`
	ShopID            uint64    `gorm:"not null;index:idx_donations_shop_id" json:"shop_id"`
	FoodName          string    `gorm:"type:varchar(150);not null" json:"food_name"`
	Description       string    `gorm:"type:text" json:"description"`
	Category          string    `gorm:"type:enum('Bakery','Restaurant','Café','Grocery','Prepared Meals','Other');not null;index:idx_donations_category" json:"category"`
	ImageURL          string    `gorm:"type:varchar(500)" json:"image_url"`
	Quantity          uint      `gorm:"not null" json:"quantity"`
	AvailableQuantity uint      `gorm:"not null" json:"available_quantity"`
	PickupDate        string    `gorm:"type:date;not null" json:"pickup_date"`
	PickupStartTime   string    `gorm:"type:varchar(5);not null" json:"pickup_start_time"`
	PickupEndTime     string    `gorm:"type:varchar(5);not null" json:"pickup_end_time"`
	PickupStartAt     time.Time `gorm:"not null" json:"pickup_start_at"`
	PickupEndAt       time.Time `gorm:"not null;index:idx_donations_status_end" json:"pickup_end_at"`
	DeliveryAvailable bool      `gorm:"not null;default:false" json:"delivery_available"`
	DeliveryNotes     string    `gorm:"type:varchar(255)" json:"delivery_notes,omitempty"`
	Status            string    `gorm:"type:enum('Active','Fully Claimed','Expired','Cancelled');not null;default:'Active';index:idx_donations_status_end" json:"status"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Shop *Shop `gorm:"foreignKey:ShopID" json:"shop,omitempty"`
}

// DonationClaim represents a free food reservation claimed by an approved Beneficiary.
type DonationClaim struct {
	ID                uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	ClaimCode         string     `gorm:"type:varchar(20);not null;uniqueIndex:uq_claims_code" json:"claim_code"`
	DonationID        uint64     `gorm:"not null;index:idx_claims_donation_id" json:"donation_id"`
	BeneficiaryID     uint64     `gorm:"not null;index:idx_claims_beneficiary_id" json:"beneficiary_id"`
	Quantity          uint       `gorm:"not null" json:"quantity"`
	DeliveryRequested bool       `gorm:"not null;default:false" json:"delivery_requested"`
	DeliveryAddress   string     `gorm:"type:varchar(255)" json:"delivery_address,omitempty"`
	DeliveryNotes     string     `gorm:"type:text" json:"delivery_notes,omitempty"`
	Status            string     `gorm:"type:enum('Active','Fulfilled','Cancelled','Expired');not null;default:'Active';index:idx_claims_status" json:"status"`
	FulfilledAt       *time.Time `json:"fulfilled_at,omitempty"`
	FulfillmentNotes  string     `gorm:"type:text" json:"fulfillment_notes,omitempty"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	Donation    *FoodDonation `gorm:"foreignKey:DonationID" json:"donation,omitempty"`
	Beneficiary *User         `gorm:"foreignKey:BeneficiaryID" json:"beneficiary,omitempty"`
}
