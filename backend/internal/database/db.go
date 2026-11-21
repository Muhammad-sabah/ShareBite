package database

import (
	"errors"
	"fmt"
	"log"
	"time"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/util"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens a MySQL GORM connection and configures connection pooling.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Warn
	if cfg.AppEnv == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logLevel),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping MySQL: %w", err)
	}

	return db, nil
}

// relaxLegacyColumns finds any unexpected NOT NULL columns without default values
// created by older iterations of the project and relaxes them to NULL DEFAULT NULL.
func relaxLegacyColumns(db *gorm.DB, tableName string, knownCols map[string]bool) {
	if !db.Migrator().HasTable(tableName) {
		return
	}
	type colInfo struct {
		ColumnName string
		ColumnType string
	}
	var cols []colInfo
	err := db.Raw(`
		SELECT column_name, column_type 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		  AND table_name = ? 
		  AND is_nullable = 'NO' 
		  AND column_default IS NULL 
		  AND extra != 'auto_increment'
	`, tableName).Scan(&cols).Error
	if err != nil {
		return
	}
	for _, c := range cols {
		if !knownCols[c.ColumnName] {
			alterSQL := fmt.Sprintf("ALTER TABLE `%s` MODIFY COLUMN `%s` %s NULL DEFAULT NULL", tableName, c.ColumnName, c.ColumnType)
			if err := db.Exec(alterSQL).Error; err != nil {
				log.Printf("[Database] Note altering legacy column %s.%s: %v", tableName, c.ColumnName, err)
			} else {
				log.Printf("[Database] Relaxed legacy column %s.%s to allow NULL", tableName, c.ColumnName)
			}
		}
	}
}

// AutoMigrate ensures database tables exist and match our GORM models.
// Compatible with TiDB Cloud: skips redundant index/constraint drop errors
// on tables that are already established with foreign key constraints.
func AutoMigrate(db *gorm.DB) error {
	// 1. Ensure users.role ENUM supports all current roles ('customer', 'shop_owner', 'admin', 'beneficiary')
	if db.Migrator().HasTable(&models.User{}) {
		if err := db.Exec("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'shop_owner', 'admin', 'beneficiary') NOT NULL DEFAULT 'customer'").Error; err != nil {
			log.Printf("[Database] Note on users.role enum migration: %v", err)
		}
	}

	// 2. Relax any legacy columns in 'offers' table so inserts do not fail with Error 1364
	relaxLegacyColumns(db, "offers", map[string]bool{
		"id": true, "offer_code": true, "shop_id": true, "food_name": true,
		"description": true, "category": true, "image_url": true, "original_price": true,
		"discounted_price": true, "original_quantity": true, "available_quantity": true,
		"pickup_date": true, "pickup_start_time": true, "pickup_end_time": true,
		"pickup_start_at": true, "pickup_end_at": true, "status": true,
		"created_at": true, "updated_at": true,
	})

	// 3. Relax any legacy columns in 'shops' table
	relaxLegacyColumns(db, "shops", map[string]bool{
		"id": true, "owner_id": true, "shop_name": true, "category": true,
		"contact_number": true, "address": true, "description": true,
		"created_at": true, "updated_at": true,
	})

	modelsToMigrate := []interface{}{
		&models.User{},
		&models.Shop{},
		&models.Offer{},
		&models.Reservation{},
		&models.BeneficiaryProfile{},
		&models.FoodDonation{},
		&models.DonationClaim{},
	}

	for _, m := range modelsToMigrate {
		if !db.Migrator().HasTable(m) {
			if err := db.Migrator().CreateTable(m); err != nil {
				return fmt.Errorf("failed to create table for %T: %w", m, err)
			}
			log.Printf("[Database] Created missing table for %T", m)
			continue
		}

		if err := db.AutoMigrate(m); err != nil {
			log.Printf("[Database] Note: AutoMigrate on existing table %T: %v (safe to ignore on existing schema)", m, err)
		}
	}

	return nil
}

// EnsureAdminUser checks if an admin exists, and if not, bootstraps a secure administrator account.
func EnsureAdminUser(db *gorm.DB, cfg *config.Config) error {
	var count int64
	if err := db.Model(&models.User{}).Where("role = ? AND username = ?", models.RoleAdmin, cfg.AdminUsername).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hash, err := util.HashPassword(cfg.AdminPassword)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	admin := models.User{
		Role:         models.RoleAdmin,
		Username:     cfg.AdminUsername,
		PasswordHash: hash,
		FullName:     cfg.AdminFullName,
		PhoneNumber:  "07700000000",
	}

	if err := db.Create(&admin).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	log.Printf("[Database] Initialized default admin account: username=%s", cfg.AdminUsername)
	return nil
}

// EnsureDemoBeneficiary checks if the demo beneficiary exists, and ensures it is Approved for demonstrations.
func EnsureDemoBeneficiary(db *gorm.DB, cfg *config.Config) error {
	var user models.User
	err := db.Where("role = ? AND username = ?", models.RoleBeneficiary, cfg.DemoBeneficiaryUsername).First(&user).Error
	if err != nil {
		hash, err := util.HashPassword(cfg.DemoBeneficiaryPassword)
		if err != nil {
			return fmt.Errorf("failed to hash demo beneficiary password: %w", err)
		}

		user = models.User{
			Role:         models.RoleBeneficiary,
			Username:     cfg.DemoBeneficiaryUsername,
			PasswordHash: hash,
			FullName:     cfg.DemoBeneficiaryFullName,
			PhoneNumber:  "07705556677",
		}

		if err := db.Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create demo beneficiary user: %w", err)
		}
	}

	// Ensure approved profile exists
	var profile models.BeneficiaryProfile
	if err := db.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		profile = models.BeneficiaryProfile{
			UserID:             user.ID,
			BeneficiaryType:    "Family",
			FamilyMembers:      4,
			Address:            "Mawlawi Quarter, Sulaymaniyah",
			VerificationStatus: models.BeneficiaryStatusApproved,
			Source:             "Admin Referral",
			Notes:              "Official pre-approved demonstration beneficiary for events and showcase testing.",
		}
		if err := db.Create(&profile).Error; err != nil {
			return fmt.Errorf("failed to create demo beneficiary profile: %w", err)
		}
	} else if profile.VerificationStatus != models.BeneficiaryStatusApproved {
		db.Model(&profile).Update("verification_status", models.BeneficiaryStatusApproved)
	}

	log.Printf("[Database] Initialized approved demo beneficiary account: username=%s", cfg.DemoBeneficiaryUsername)
	return nil
}

func upsertDemoUser(db *gorm.DB, username, role, password, fullName, phone string) (*models.User, error) {
	hash, err := util.HashPassword(password)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = db.Where("username = ?", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			user = models.User{
				Role:         role,
				Username:     username,
				PasswordHash: hash,
				FullName:     fullName,
				PhoneNumber:  phone,
			}
			if err := db.Create(&user).Error; err != nil {
				return nil, err
			}
			return &user, nil
		}
		return nil, err
	}

	user.Role = role
	user.PasswordHash = hash
	user.FullName = fullName
	user.PhoneNumber = phone
	if err := db.Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func upsertDemoShop(db *gorm.DB, ownerID uint64, shopName, category, contact, address, desc string) (*models.Shop, error) {
	var shop models.Shop
	err := db.Where("shop_name = ?", shopName).First(&shop).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			shop = models.Shop{
				OwnerID:       ownerID,
				ShopName:      shopName,
				Category:      category,
				ContactNumber: contact,
				Address:       address,
				Description:   desc,
			}
			if err := db.Create(&shop).Error; err != nil {
				return nil, err
			}
			return &shop, nil
		}
		return nil, err
	}

	shop.OwnerID = ownerID
	shop.Category = category
	shop.ContactNumber = contact
	shop.Address = address
	shop.Description = desc
	if err := db.Save(&shop).Error; err != nil {
		return nil, err
	}
	return &shop, nil
}

func upsertDemoOffer(db *gorm.DB, o *models.Offer) error {
	o.Title = o.FoodName
	o.Quantity = o.AvailableQuantity
	o.Price = o.DiscountedPrice

	var existing models.Offer
	err := db.Where("offer_code = ?", o.OfferCode).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return db.Create(o).Error
		}
		return err
	}

	existing.ShopID = o.ShopID
	existing.FoodName = o.FoodName
	existing.Title = o.FoodName
	existing.Description = o.Description
	existing.Category = o.Category
	existing.ImageURL = o.ImageURL
	existing.OriginalPrice = o.OriginalPrice
	existing.DiscountedPrice = o.DiscountedPrice
	existing.Price = o.DiscountedPrice
	existing.OriginalQuantity = o.OriginalQuantity
	existing.AvailableQuantity = o.AvailableQuantity
	existing.Quantity = o.AvailableQuantity
	existing.PickupDate = o.PickupDate
	existing.PickupStartTime = o.PickupStartTime
	existing.PickupEndTime = o.PickupEndTime
	existing.PickupStartAt = o.PickupStartAt
	existing.PickupEndAt = o.PickupEndAt
	existing.Status = models.OfferStatusActive

	return db.Save(&existing).Error
}

// SeedDemoData inserts realistic fictional Sulaymaniyah demonstration data (idempotent).
// All demo shops and accounts are fictional demonstration entities.
func SeedDemoData(db *gorm.DB, loc *time.Location) error {
	log.Println("[Database] Ensuring fictional Sulaymaniyah demonstration data...")

	// 1. Demo Customers (Sara Ahmed, Ali Hassan)
	cust1, err := upsertDemoUser(db, "customer1", models.RoleCustomer, "pass123", "Sara Ahmed", "07701234567")
	if err != nil {
		log.Printf("[Database] Warning: seed customer1: %v", err)
	}
	_, err = upsertDemoUser(db, "customer2", models.RoleCustomer, "pass123", "Ali Hassan", "07709876543")
	if err != nil {
		log.Printf("[Database] Warning: seed customer2: %v", err)
	}

	// 2. Demo Shop Owners & Shops
	owner1, err := upsertDemoUser(db, "bakery1", models.RoleShopOwner, "pass123", "Karwan Ibrahim", "07701112233")
	if err != nil {
		log.Printf("[Database] Warning: seed bakery1: %v", err)
	}
	owner2, err := upsertDemoUser(db, "cafe1", models.RoleShopOwner, "pass123", "Dara Hassan", "07704445566")
	if err != nil {
		log.Printf("[Database] Warning: seed cafe1: %v", err)
	}
	owner3, err := upsertDemoUser(db, "restaurant1", models.RoleShopOwner, "pass123", "Rebwar Ali", "07707778899")
	if err != nil {
		log.Printf("[Database] Warning: seed restaurant1: %v", err)
	}

	var shop1, shop2, shop3 *models.Shop
	if owner1 != nil {
		shop1, err = upsertDemoShop(db, owner1.ID, "City Star Bakery", "Bakery", "07701112233", "Salim Street, Sulaymaniyah", "Fictional demo bakery offering daily surplus pastries, croissants, and cakes.")
		if err != nil {
			log.Printf("[Database] Warning: seed shop1: %v", err)
		}
	}
	if owner2 != nil {
		shop2, err = upsertDemoShop(db, owner2.ID, "Mawlawi Cafe", "Café", "07704445566", "Mawlawi Street, Sulaymaniyah", "Fictional demo café serving specialty coffee, pastries, and fresh sandwiches.")
		if err != nil {
			log.Printf("[Database] Warning: seed shop2: %v", err)
		}
	}
	if owner3 != nil {
		shop3, err = upsertDemoShop(db, owner3.ID, "Sardar Restaurant", "Restaurant", "07707778899", "Rizgary Quarter, Sulaymaniyah", "Fictional demo restaurant sharing surplus grilled platters and shawarma combos.")
		if err != nil {
			log.Printf("[Database] Warning: seed shop3: %v", err)
		}
	}

	// Relative pickup dates so demo offers are always live & demonstrable
	now := time.Now().In(loc)
	todayDate := now.Format("2006-01-02")
	tomorrowDate := now.Add(24 * time.Hour).Format("2006-01-02")

	// If current local time is after 22:30, place today's offers on tomorrow too so countdowns stay positive
	firstDay := todayDate
	if now.Hour() >= 22 {
		firstDay = tomorrowDate
	}

	makeWindow := func(dateStr, startHHMM, endHHMM string) (time.Time, time.Time) {
		s, _ := time.ParseInLocation("2006-01-02 15:04", dateStr+" "+startHHMM, loc)
		e, _ := time.ParseInLocation("2006-01-02 15:04", dateStr+" "+endHHMM, loc)
		return s, e
	}

	s1, e1 := makeWindow(firstDay, "14:00", "23:45")
	s2, e2 := makeWindow(firstDay, "16:00", "23:55")
	s3, e3 := makeWindow(firstDay, "15:00", "23:30")
	s4, e4 := makeWindow(tomorrowDate, "13:00", "18:00")
	s5, e5 := makeWindow(tomorrowDate, "15:00", "21:00")
	s6, e6 := makeWindow(tomorrowDate, "16:00", "22:00")

	shop1ID := uint64(1)
	if shop1 != nil {
		shop1ID = shop1.ID
	}
	shop2ID := uint64(2)
	if shop2 != nil {
		shop2ID = shop2.ID
	}
	shop3ID := uint64(3)
	if shop3 != nil {
		shop3ID = shop3.ID
	}

	offers := []models.Offer{
		{
			OfferCode:         "O0001",
			ShopID:            shop1ID,
			FoodName:          "Croissant Box (6 pcs)",
			Description:       "Assorted freshly baked butter and chocolate croissants from today's batch.",
			Category:          "Bakery",
			ImageURL:          "/images/food/croissant.svg",
			OriginalPrice:     5000,
			DiscountedPrice:   3000,
			OriginalQuantity:  8,
			AvailableQuantity: 6,
			PickupDate:        firstDay,
			PickupStartTime:   "14:00",
			PickupEndTime:     "23:45",
			PickupStartAt:     s1,
			PickupEndAt:       e1,
			Status:            models.OfferStatusActive,
		},
		{
			OfferCode:         "O0002",
			ShopID:            shop1ID,
			FoodName:          "Cake Slice Assortment",
			Description:       "Four generous slices of fresh sponge, pistachio, and chocolate layer cake.",
			Category:          "Bakery",
			ImageURL:          "/images/food/cake.svg",
			OriginalPrice:     8000,
			DiscountedPrice:   5500,
			OriginalQuantity:  4,
			AvailableQuantity: 4,
			PickupDate:        firstDay,
			PickupStartTime:   "16:00",
			PickupEndTime:     "23:55",
			PickupStartAt:     s2,
			PickupEndAt:       e2,
			Status:            models.OfferStatusActive,
		},
		{
			OfferCode:         "O0003",
			ShopID:            shop2ID,
			FoodName:          "Latte & Pastry Set",
			Description:       "Two signature iced or hot lattes paired with warm danish pastries.",
			Category:          "Café",
			ImageURL:          "/images/food/latte-pastry.svg",
			OriginalPrice:     7000,
			DiscountedPrice:   4500,
			OriginalQuantity:  6,
			AvailableQuantity: 6,
			PickupDate:        firstDay,
			PickupStartTime:   "15:00",
			PickupEndTime:     "23:30",
			PickupStartAt:     s3,
			PickupEndAt:       e3,
			Status:            models.OfferStatusActive,
		},
		{
			OfferCode:         "O0004",
			ShopID:            shop2ID,
			FoodName:          "Sandwich Box",
			Description:       "Two toasted artisan paninis with smoked turkey, mozzarella, and herbs.",
			Category:          "Café",
			ImageURL:          "/images/food/sandwich.svg",
			OriginalPrice:     5000,
			DiscountedPrice:   3500,
			OriginalQuantity:  5,
			AvailableQuantity: 5,
			PickupDate:        tomorrowDate,
			PickupStartTime:   "13:00",
			PickupEndTime:     "18:00",
			PickupStartAt:     s4,
			PickupEndAt:       e4,
			Status:            models.OfferStatusActive,
		},
		{
			OfferCode:         "O0005",
			ShopID:            shop3ID,
			FoodName:          "Chicken Shawarma Combo",
			Description:       "Two large charcoal-roasted chicken shawarma wraps with seasoned garlic fries.",
			Category:          "Restaurant",
			ImageURL:          "/images/food/shawarma.svg",
			OriginalPrice:     6000,
			DiscountedPrice:   4000,
			OriginalQuantity:  10,
			AvailableQuantity: 10,
			PickupDate:        tomorrowDate,
			PickupStartTime:   "15:00",
			PickupEndTime:     "21:00",
			PickupStartAt:     s5,
			PickupEndAt:       e5,
			Status:            models.OfferStatusActive,
		},
		{
			OfferCode:         "O0006",
			ShopID:            shop3ID,
			FoodName:          "Meal Box (Rice & Grilled)",
			Description:       "Fragrant basmati rice platter with charcoal-grilled chicken skewers and fresh salad.",
			Category:          "Restaurant",
			ImageURL:          "/images/food/meal-box.svg",
			OriginalPrice:     10000,
			DiscountedPrice:   7000,
			OriginalQuantity:  6,
			AvailableQuantity: 6,
			PickupDate:        tomorrowDate,
			PickupStartTime:   "16:00",
			PickupEndTime:     "22:00",
			PickupStartAt:     s6,
			PickupEndAt:       e6,
			Status:            models.OfferStatusActive,
		},
	}

	for i := range offers {
		if err := upsertDemoOffer(db, &offers[i]); err != nil {
			log.Printf("[Database] Warning: seed offer %s: %v", offers[i].OfferCode, err)
		}
	}

	// 4. Demo Reservation (Section 8.4)
	if cust1 != nil && len(offers) > 0 {
		var firstOffer models.Offer
		if err := db.Where("offer_code = ?", "O0001").First(&firstOffer).Error; err == nil {
			var existing models.Reservation
			if err := db.Where("reservation_code = ?", "R0001").First(&existing).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					res := models.Reservation{
						ReservationCode: "R0001",
						CustomerID:      cust1.ID,
						OfferID:         firstOffer.ID,
						Quantity:        2,
						UnitPrice:       3000,
						TotalPrice:      6000,
						Status:          models.ReservationStatusActive,
					}
					if err := db.Create(&res).Error; err != nil {
						log.Printf("[Database] Warning: seed reservation R0001: %v", err)
					}
				}
			}
		}
	}

	log.Println("[Database] Demo data seeding finished successfully.")
	return nil
}
