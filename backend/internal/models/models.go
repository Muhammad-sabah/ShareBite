package models

import "time"

// User roles
const (
	RoleCustomer  = "customer"
	RoleShopOwner = "shop_owner"
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

// User represents either a Customer or a Shop Owner account.
type User struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Role         string    `gorm:"type:enum('customer','shop_owner');not null;uniqueIndex:uq_users_role_username;index:idx_users_role" json:"role"`
	Username     string    `gorm:"type:varchar(64);not null;uniqueIndex:uq_users_role_username" json:"username"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FullName     string    `gorm:"type:varchar(120);not null" json:"full_name"`
	PhoneNumber  string    `gorm:"type:varchar(20);not null" json:"phone_number"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Shop *Shop `gorm:"foreignKey:OwnerID" json:"shop,omitempty"`
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

