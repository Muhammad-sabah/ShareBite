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
	ID          uint64               `json:"id"`
	Role        string               `json:"role"`
	Username    string               `json:"username"`
	FullName    string               `json:"full_name"`
	PhoneNumber string               `json:"phone_number"`
	Shop        *ShopProfileResponse `json:"shop,omitempty"`
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

