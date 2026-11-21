package database

import (
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

	// 2. If legacy columns exist in 'offers', ensure they allow NULL and have defaults
	if db.Migrator().HasTable(&models.Offer{}) {
		if db.Migrator().HasColumn(&models.Offer{}, "title") {
			_ = db.Exec("ALTER TABLE offers MODIFY COLUMN title VARCHAR(150) NULL DEFAULT ''").Error
		}
		if db.Migrator().HasColumn(&models.Offer{}, "quantity") {
			_ = db.Exec("ALTER TABLE offers MODIFY COLUMN quantity INT UNSIGNED NULL DEFAULT 0").Error
		}
		if db.Migrator().HasColumn(&models.Offer{}, "price") {
			_ = db.Exec("ALTER TABLE offers MODIFY COLUMN price INT UNSIGNED NULL DEFAULT 0").Error
		}
	}

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

// SeedDemoData inserts realistic fictional Sulaymaniyah demonstration data
// if the customer1 demo account does not yet exist (idempotent).
// All demo shops and accounts are fictional demonstration entities.
func SeedDemoData(db *gorm.DB, loc *time.Location) error {
	var custCount int64
	if err := db.Model(&models.User{}).Where("username = ?", "customer1").Count(&custCount).Error; err != nil {
		return err
	}
	if custCount > 0 {
		return nil
	}

	log.Println("Seeding fictional Sulaymaniyah demonstration data...")

	demoHash, err := util.HashPassword("pass123")
	if err != nil {
		return err
	}

	// 1. Demo Customers (Section 8.1)
	cust1 := models.User{
		Role:         models.RoleCustomer,
		Username:     "customer1",
		PasswordHash: demoHash,
		FullName:     "Sara Ahmed",
		PhoneNumber:  "07701234567",
	}
	cust2 := models.User{
		Role:         models.RoleCustomer,
		Username:     "customer2",
		PasswordHash: demoHash,
		FullName:     "Ali Hassan",
		PhoneNumber:  "07709876543",
	}
	for _, c := range []*models.User{&cust1, &cust2} {
		if err := db.Where("username = ?", c.Username).FirstOrCreate(c).Error; err != nil {
			log.Printf("[Database] Warning: seed customer %s: %v", c.Username, err)
		}
	}

	// 2. Demo Shop Owners & Shops (Section 8.2 - fictional demo businesses)
	owner1 := models.User{
		Role:         models.RoleShopOwner,
		Username:     "bakery1",
		PasswordHash: demoHash,
		FullName:     "Karwan Ibrahim",
		PhoneNumber:  "07701112233",
	}
	owner2 := models.User{
		Role:         models.RoleShopOwner,
		Username:     "cafe1",
		PasswordHash: demoHash,
		FullName:     "Dara Hassan",
		PhoneNumber:  "07704445566",
	}
	owner3 := models.User{
		Role:         models.RoleShopOwner,
		Username:     "restaurant1",
		PasswordHash: demoHash,
		FullName:     "Rebwar Ali",
		PhoneNumber:  "07707778899",
	}
	for _, o := range []*models.User{&owner1, &owner2, &owner3} {
		if err := db.Where("username = ?", o.Username).FirstOrCreate(o).Error; err != nil {
			log.Printf("[Database] Warning: seed owner %s: %v", o.Username, err)
		}
	}

	shop1 := models.Shop{
		OwnerID:       owner1.ID,
		ShopName:      "City Star Bakery",
		Category:      "Bakery",
		ContactNumber: "07701112233",
		Address:       "Salim Street, Sulaymaniyah",
		Description:   "Fictional demo bakery offering daily surplus pastries, croissants, and cakes.",
	}
	shop2 := models.Shop{
		OwnerID:       owner2.ID,
		ShopName:      "Mawlawi Cafe",
		Category:      "Café",
		ContactNumber: "07704445566",
		Address:       "Mawlawi Street, Sulaymaniyah",
		Description:   "Fictional demo café serving specialty coffee, pastries, and fresh sandwiches.",
	}
	shop3 := models.Shop{
		OwnerID:       owner3.ID,
		ShopName:      "Sardar Restaurant",
		Category:      "Restaurant",
		ContactNumber: "07707778899",
		Address:       "Rizgary Quarter, Sulaymaniyah",
		Description:   "Fictional demo restaurant sharing surplus grilled platters and shawarma combos.",
	}
	for _, s := range []*models.Shop{&shop1, &shop2, &shop3} {
		if err := db.Where("shop_name = ?", s.ShopName).FirstOrCreate(s).Error; err != nil {
			log.Printf("[Database] Warning: seed shop %s: %v", s.ShopName, err)
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

		offers := []models.Offer{
			{
				OfferCode:         "O0001",
				ShopID:            shop1.ID,
				FoodName:          "Croissant Box (6 pcs)",
				Description:       "Assorted freshly baked butter and chocolate croissants from today's batch.",
				Category:          "Bakery",
				ImageURL:          "/images/food/croissant.svg",
				OriginalPrice:     5000,
				DiscountedPrice:   3000,
				OriginalQuantity:  8,
				AvailableQuantity: 6, // 8 - 2 reserved in demo reservation R0001
				PickupDate:        firstDay,
				PickupStartTime:   "14:00",
				PickupEndTime:     "23:45",
				PickupStartAt:     s1,
				PickupEndAt:       e1,
				Status:            models.OfferStatusActive,
			},
			{
				OfferCode:         "O0002",
				ShopID:            shop1.ID,
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
				ShopID:            shop2.ID,
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
				ShopID:            shop2.ID,
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
				ShopID:            shop3.ID,
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
				ShopID:            shop3.ID,
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
		o := &offers[i]
		o.Title = o.FoodName
		o.Quantity = o.AvailableQuantity
		o.Price = o.DiscountedPrice
		if err := db.Where("offer_code = ?", o.OfferCode).FirstOrCreate(o).Error; err != nil {
			log.Printf("[Database] Warning: seed offer %s: %v", o.OfferCode, err)
		}
	}

	// 4. Demo Reservation (Section 8.4)
	if len(offers) > 0 && offers[0].ID > 0 {
		res := models.Reservation{
			ReservationCode: "R0001",
			CustomerID:      cust1.ID,
			OfferID:         offers[0].ID,
			Quantity:        2,
			UnitPrice:       3000,
			TotalPrice:      6000,
			Status:          models.ReservationStatusActive,
		}
		if err := db.Where("reservation_code = ?", res.ReservationCode).FirstOrCreate(&res).Error; err != nil {
			log.Printf("[Database] Warning: seed reservation %s: %v", res.ReservationCode, err)
		}
	}

	log.Println("[Database] Demo data seeding finished successfully.")
	return nil
}
