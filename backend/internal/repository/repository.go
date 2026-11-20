package repository

import (
	"fmt"
	"strings"
	"time"

	"baqaya-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Repository wraps GORM database operations for Baqaya entities.
type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) DB() *gorm.DB {
	return r.db
}

// ---- Lifecycle Expiry Sync (FR-LIFE-02, FR-LIFE-03) ----

// SyncExpiries transitions expired offers and active reservations in a transaction.
// Deactivated offers NEVER transition to Expired (FR-LIFE-05).
// Active reservations expire when their associated offer's pickup_end_at <= now,
// regardless of whether the offer is Active, Sold Out, or Deactivated.
func (r *Repository) SyncExpiries(now time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return SyncExpiriesTx(tx, now)
	})
}

func SyncExpiriesTx(tx *gorm.DB, now time.Time) error {
	if err := tx.Model(&models.Offer{}).
		Where("status IN ? AND pickup_end_at <= ?", []string{models.OfferStatusActive, models.OfferStatusSoldOut}, now).
		Update("status", models.OfferStatusExpired).Error; err != nil {
		return err
	}

	// Expire active reservations whose associated offer pickup_end_at <= now
	// Use subquery compatible with MySQL/MariaDB.
	subQuery := tx.Model(&models.Offer{}).Select("id").Where("pickup_end_at <= ?", now)
	if err := tx.Model(&models.Reservation{}).
		Where("status = ? AND offer_id IN (?)", models.ReservationStatusActive, subQuery).
		Update("status", models.ReservationStatusExpired).Error; err != nil {
		return err
	}

	return nil
}

// ---- Users & Shops ----

func (r *Repository) FindUserByRoleAndUsername(role, username string) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Shop").
		Where("role = ? AND LOWER(username) = LOWER(?)", role, strings.TrimSpace(username)).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) FindUserByID(id uint64) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Shop").First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) ShopNameExists(shopName string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Shop{}).
		Where("LOWER(shop_name) = LOWER(?)", strings.TrimSpace(shopName)).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) CreateCustomer(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *Repository) CreateShopOwnerWithShop(user *models.User, shop *models.Shop) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		shop.OwnerID = user.ID
		if err := tx.Create(shop).Error; err != nil {
			return err
		}
		user.Shop = shop
		return nil
	})
}

func (r *Repository) FindShopByOwnerID(ownerID uint64) (*models.Shop, error) {
	var shop models.Shop
	if err := r.db.Where("owner_id = ?", ownerID).First(&shop).Error; err != nil {
		return nil, err
	}
	return &shop, nil
}

func (r *Repository) UpdateShopProfile(shop *models.Shop) error {
	return r.db.Save(shop).Error
}

// ---- Offers ----

func (r *Repository) NextOfferCodeTx(tx *gorm.DB) (string, error) {
	var maxID uint64
	if err := tx.Model(&models.Offer{}).Select("COALESCE(MAX(id), 0)").Scan(&maxID).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("O%04d", maxID+1), nil
}

func (r *Repository) CreateOffer(offer *models.Offer) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		code, err := r.NextOfferCodeTx(tx)
		if err != nil {
			return err
		}
		offer.OfferCode = code
		return tx.Create(offer).Error
	})
}

func (r *Repository) ListAvailableOffers(now time.Time, search, category, sortBy string) ([]models.Offer, error) {
	query := r.db.Preload("Shop").
		Joins("JOIN shops ON shops.id = offers.shop_id").
		Where("offers.status = ? AND offers.available_quantity > 0 AND offers.pickup_end_at > ?", models.OfferStatusActive, now)

	if trimmedCat := strings.TrimSpace(category); trimmedCat != "" && trimmedCat != "All" {
		query = query.Where("offers.category = ?", trimmedCat)
	}

	if trimmedSearch := strings.TrimSpace(search); trimmedSearch != "" {
		like := "%" + strings.ToLower(trimmedSearch) + "%"
		query = query.Where(
			"LOWER(offers.food_name) LIKE ? OR LOWER(offers.description) LIKE ? OR LOWER(shops.shop_name) LIKE ? OR LOWER(shops.address) LIKE ?",
			like, like, like, like,
		)
	}

	switch sortBy {
	case "price_asc":
		query = query.Order("offers.discounted_price ASC, offers.pickup_end_at ASC")
	case "discount_desc":
		query = query.Order("((offers.original_price - offers.discounted_price) / offers.original_price) DESC, offers.pickup_end_at ASC")
	default:
		// Ending soonest first
		query = query.Order("offers.pickup_end_at ASC, offers.id DESC")
	}

	var offers []models.Offer
	if err := query.Find(&offers).Error; err != nil {
		return nil, err
	}
	return offers, nil
}

func (r *Repository) FindOfferByID(id uint64) (*models.Offer, error) {
	var offer models.Offer
	if err := r.db.Preload("Shop").First(&offer, id).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}

func (r *Repository) FindOfferForUpdateTx(tx *gorm.DB, id uint64) (*models.Offer, error) {
	var offer models.Offer
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Shop").First(&offer, id).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}

func (r *Repository) ListOffersByShop(shopID uint64, statusFilter string) ([]models.Offer, error) {
	query := r.db.Preload("Shop").Where("shop_id = ?", shopID)
	if trimmed := strings.TrimSpace(statusFilter); trimmed != "" && trimmed != "All" {
		query = query.Where("status = ?", trimmed)
	}
	query = query.Order("FIELD(status, 'Active', 'Sold Out', 'Expired', 'Deactivated'), created_at DESC")

	var offers []models.Offer
	if err := query.Find(&offers).Error; err != nil {
		return nil, err
	}
	return offers, nil
}

func (r *Repository) CountActiveReservationsByOffer(offerID uint64) (int64, error) {
	var count int64
	err := r.db.Model(&models.Reservation{}).
		Where("offer_id = ? AND status = ?", offerID, models.ReservationStatusActive).
		Count(&count).Error
	return count, err
}

func (r *Repository) CountActiveReservationsMapForShop(shopID uint64) (map[uint64]int64, error) {
	type row struct {
		OfferID uint64
		Cnt     int64
	}
	var rows []row
	err := r.db.Table("reservations").
		Select("reservations.offer_id as offer_id, COUNT(*) as cnt").
		Joins("JOIN offers ON offers.id = reservations.offer_id").
		Where("offers.shop_id = ? AND reservations.status = ?", shopID, models.ReservationStatusActive).
		Group("reservations.offer_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	res := make(map[uint64]int64, len(rows))
	for _, rw := range rows {
		res[rw.OfferID] = rw.Cnt
	}
	return res, nil
}

// ---- Reservations ----

func (r *Repository) NextReservationCodeTx(tx *gorm.DB) (string, error) {
	var maxID uint64
	if err := tx.Model(&models.Reservation{}).Select("COALESCE(MAX(id), 0)").Scan(&maxID).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("R%04d", maxID+1), nil
}

func (r *Repository) ListReservationsByCustomer(customerID uint64) ([]models.Reservation, error) {
	var reservations []models.Reservation
	err := r.db.Preload("Offer").Preload("Offer.Shop").
		Joins("JOIN offers ON offers.id = reservations.offer_id").
		Where("reservations.customer_id = ?", customerID).
		Order("CASE WHEN reservations.status = 'Active' THEN 0 ELSE 1 END ASC, offers.pickup_date DESC, offers.pickup_end_time DESC, reservations.id DESC").
		Find(&reservations).Error
	return reservations, err
}

func (r *Repository) FindReservationByID(id uint64) (*models.Reservation, error) {
	var res models.Reservation
	err := r.db.Preload("Customer").Preload("Offer").Preload("Offer.Shop").First(&res, id).Error
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *Repository) ListReservationsByShop(shopID uint64, statusFilter string) ([]models.Reservation, error) {
	query := r.db.Preload("Customer").Preload("Offer").Preload("Offer.Shop").
		Joins("JOIN offers ON offers.id = reservations.offer_id").
		Where("offers.shop_id = ?", shopID)

	if trimmed := strings.TrimSpace(statusFilter); trimmed != "" && trimmed != "All" {
		query = query.Where("reservations.status = ?", trimmed)
	}

	query = query.Order("CASE WHEN reservations.status = 'Active' THEN 0 ELSE 1 END ASC, reservations.created_at DESC")

	var reservations []models.Reservation
	err := query.Find(&reservations).Error
	return reservations, err
}

func (r *Repository) ShopStats(shopID uint64) (activeOffers, totalOffers, activeRes, totalRes int64, err error) {
	if err = r.db.Model(&models.Offer{}).Where("shop_id = ?", shopID).Count(&totalOffers).Error; err != nil {
		return
	}
	if err = r.db.Model(&models.Offer{}).Where("shop_id = ? AND status = ?", shopID, models.OfferStatusActive).Count(&activeOffers).Error; err != nil {
		return
	}
	if err = r.db.Table("reservations").
		Joins("JOIN offers ON offers.id = reservations.offer_id").
		Where("offers.shop_id = ?", shopID).
		Count(&totalRes).Error; err != nil {
		return
	}
	if err = r.db.Table("reservations").
		Joins("JOIN offers ON offers.id = reservations.offer_id").
		Where("offers.shop_id = ? AND reservations.status = ?", shopID, models.ReservationStatusActive).
		Count(&activeRes).Error; err != nil {
		return
	}
	return
}

