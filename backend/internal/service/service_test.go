package service_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/database"
	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/repository"
	"baqaya-backend/internal/router"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type testEnv struct {
	cfg     *config.Config
	db      *gorm.DB
	repo    *repository.Repository
	authSvc *service.AuthService
	offSvc  *service.OfferService
	resSvc  *service.ReservationService
	engine  *gin.Engine
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func setupTestEnv(t *testing.T) *testEnv {
	t.Helper()
	gin.SetMode(gin.TestMode)

	loc := time.FixedZone("Asia/Baghdad", 3*60*60)
	time.Local = loc

	host := envOr("TEST_DB_HOST", envOr("DB_HOST", "127.0.0.1"))
	port := envOr("TEST_DB_PORT", envOr("DB_PORT", "3306"))
	user := envOr("TEST_DB_USER", envOr("DB_USER", "root"))
	pass := os.Getenv("TEST_DB_PASSWORD")
	if pass == "" {
		pass = os.Getenv("DB_PASSWORD")
	}
	dbName := envOr("TEST_DB_NAME", "baqaya_test")

	// Ensure isolated test database exists before connecting to it.
	rootDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local", user, pass, host, port)
	rootDB, err := gorm.Open(mysql.Open(rootDSN), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("failed to connect to MySQL server (%s:%s): %v", host, port, err)
	}
	if err := rootDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", dbName)).Error; err != nil {
		t.Fatalf("failed to create test database %s: %v", dbName, err)
	}
	if sqlRoot, err := rootDB.DB(); err == nil {
		_ = sqlRoot.Close()
	}

	cfg := &config.Config{
		AppEnv:             "test",
		ServerPort:         "0",
		Timezone:           "Asia/Baghdad",
		Location:           loc,
		CORSAllowedOrigins: []string{"http://localhost:5173"},
		DBHost:             host,
		DBPort:             port,
		DBUser:             user,
		DBPassword:         pass,
		DBName:             dbName,
		JWTSecret:          "baqaya-integration-test-jwt-secret",
		JWTExpiryHours:     24,
		SeedDemoData:       false,
		UploadDir:          t.TempDir(),
	}

	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("AutoMigrate failed: %v", err)
	}

	// Clean tables in FK-safe order for deterministic tests.
	db.Exec("SET FOREIGN_KEY_CHECKS = 0")
	for _, tbl := range []string{"reservations", "offers", "shops", "users"} {
		if err := db.Exec("TRUNCATE TABLE " + tbl).Error; err != nil {
			t.Fatalf("failed to truncate %s: %v", tbl, err)
		}
	}
	db.Exec("SET FOREIGN_KEY_CHECKS = 1")

	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	repo := repository.New(db)
	return &testEnv{
		cfg:     cfg,
		db:      db,
		repo:    repo,
		authSvc: service.NewAuthService(repo, cfg),
		offSvc:  service.NewOfferService(repo, cfg),
		resSvc:  service.NewReservationService(repo, cfg),
		engine:  router.Setup(cfg, db),
	}
}

func futurePickupDate(loc *time.Location) string {
	return time.Now().In(loc).AddDate(0, 0, 1).Format("2006-01-02")
}

func assertAppErrorCode(t *testing.T, err error, expectedCode int) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error with code %d, got nil", expectedCode)
	}
	appErr, ok := err.(*service.AppError)
	if !ok {
		t.Fatalf("expected *service.AppError, got %T (%v)", err, err)
	}
	if appErr.Code != expectedCode {
		t.Fatalf("expected HTTP status %d, got %d (%s)", expectedCode, appErr.Code, appErr.Message)
	}
}

func TestAuthAndCrossRoleUsernameIsolation(t *testing.T) {
	env := setupTestEnv(t)

	// Invalid inputs rejected
	_, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Sara123",
		PhoneNumber: "07701234567",
		Username:    "sara1",
		Password:    "secret123",
	})
	assertAppErrorCode(t, err, http.StatusBadRequest)

	_, err = env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Sara Ali",
		PhoneNumber: "123",
		Username:    "sara1",
		Password:    "secret123",
	})
	assertAppErrorCode(t, err, http.StatusBadRequest)

	_, err = env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Sara Ali",
		PhoneNumber: "07701234567",
		Username:    "sara1",
		Password:    "12345",
	})
	assertAppErrorCode(t, err, http.StatusBadRequest)

	// Valid customer registration
	custResp, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Sara Ali",
		PhoneNumber: "07701234567",
		Username:    "sharedname",
		Password:    "pass1234",
	})
	if err != nil {
		t.Fatalf("RegisterCustomer failed: %v", err)
	}
	if custResp.User.Role != models.RoleCustomer || custResp.Token == "" {
		t.Fatalf("unexpected customer register response: %+v", custResp)
	}

	// Verify password is hashed in DB (never stored in plaintext)
	var dbUser models.User
	if err := env.db.First(&dbUser, custResp.User.ID).Error; err != nil {
		t.Fatalf("failed to load customer from DB: %v", err)
	}
	if dbUser.PasswordHash == "pass1234" || len(dbUser.PasswordHash) < 30 {
		t.Fatalf("password hash looks invalid or plaintext: %q", dbUser.PasswordHash)
	}

	// Duplicate customer username rejected
	_, err = env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Another Customer",
		PhoneNumber: "07701234568",
		Username:    "sharedname",
		Password:    "pass1234",
	})
	assertAppErrorCode(t, err, http.StatusConflict)

	// Same username allowed for shop owner role (FR-AUTH-02 / Spec Section 3.1)
	shopResp, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Rebwar Karim",
		ShopName:      "Zozik Bakery",
		Category:      "Bakery",
		ContactNumber: "07709998877",
		Address:       "Bakrajo Street, Sulaymaniyah",
		Username:      "sharedname",
		Password:      "shoppass123",
	})
	if err != nil {
		t.Fatalf("RegisterShopOwner failed with same username as customer: %v", err)
	}
	if shopResp.User.Role != models.RoleShopOwner || shopResp.User.Shop == nil {
		t.Fatalf("unexpected shop owner register response: %+v", shopResp)
	}

	// Login verifies both role and password separately
	if _, err := env.authSvc.Login(dto.LoginRequest{
		Role:     models.RoleCustomer,
		Username: "sharedname",
		Password: "shoppass123",
	}); err == nil {
		t.Fatalf("expected customer login with shop owner password to fail")
	}

	loginShop, err := env.authSvc.Login(dto.LoginRequest{
		Role:     models.RoleShopOwner,
		Username: "sharedname",
		Password: "shoppass123",
	})
	if err != nil || loginShop.User.ID != shopResp.User.ID {
		t.Fatalf("shop owner login failed: %v", err)
	}
}

func TestOfferValidationAndDeactivation(t *testing.T) {
	env := setupTestEnv(t)

	shopUser, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Kawa Othman",
		ShopName:      "Soran Cafe",
		Category:      "Café",
		ContactNumber: "07705556677",
		Address:       "Salim Street, Sulaymaniyah",
		Username:      "soran_cafe",
		Password:      "secret123",
	})
	if err != nil {
		t.Fatalf("register shop owner failed: %v", err)
	}

	tomorrow := futurePickupDate(env.cfg.Location)

	// Discounted price >= original price rejected
	_, err = env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Pastry Box",
		Category:          "Bakery",
		OriginalPrice:     5000,
		DiscountedPrice:   5000,
		AvailableQuantity: 5,
		PickupDate:        tomorrow,
		PickupStartTime:   "14:00",
		PickupEndTime:     "18:00",
	})
	assertAppErrorCode(t, err, http.StatusBadRequest)

	// Zero quantity rejected
	_, err = env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Pastry Box",
		Category:          "Bakery",
		OriginalPrice:     5000,
		DiscountedPrice:   2500,
		AvailableQuantity: 0,
		PickupDate:        tomorrow,
		PickupStartTime:   "14:00",
		PickupEndTime:     "18:00",
	})
	assertAppErrorCode(t, err, http.StatusBadRequest)

	// End time <= start time rejected
	_, err = env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Pastry Box",
		Category:          "Bakery",
		OriginalPrice:     5000,
		DiscountedPrice:   2500,
		AvailableQuantity: 4,
		PickupDate:        tomorrow,
		PickupStartTime:   "18:00",
		PickupEndTime:     "14:00",
	})
	assertAppErrorCode(t, err, http.StatusBadRequest)

	// Valid offer
	offer, err := env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Assorted Pastries",
		Description:       "Fresh morning batch",
		Category:          "Bakery",
		OriginalPrice:     8000,
		DiscountedPrice:   4000,
		AvailableQuantity: 6,
		PickupDate:        tomorrow,
		PickupStartTime:   "14:00",
		PickupEndTime:     "20:00",
	})
	if err != nil {
		t.Fatalf("valid CreateOffer failed: %v", err)
	}
	if offer.DiscountPercent != 50 || offer.Status != models.OfferStatusActive {
		t.Fatalf("unexpected offer attributes: %+v", offer)
	}

	// Deactivate permanently
	deactivated, err := env.offSvc.DeactivateOffer(shopUser.User.ID, offer.ID)
	if err != nil {
		t.Fatalf("DeactivateOffer failed: %v", err)
	}
	if deactivated.Status != models.OfferStatusDeactivated {
		t.Fatalf("expected Deactivated, got %s", deactivated.Status)
	}
}

func TestReservationStockSoldOutAndCancellationRecovery(t *testing.T) {
	env := setupTestEnv(t)

	shopUser, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Aram Hassan",
		ShopName:      "Goiyza Bakery",
		Category:      "Bakery",
		ContactNumber: "07701112233",
		Address:       "Mawlawi Street, Sulaymaniyah",
		Username:      "goiyza1",
		Password:      "secret123",
	})
	if err != nil {
		t.Fatalf("register shop failed: %v", err)
	}
	cust1, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Darin Rashid",
		PhoneNumber: "07711112222",
		Username:    "darin1",
		Password:    "secret123",
	})
	if err != nil {
		t.Fatalf("register cust1 failed: %v", err)
	}
	cust2, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Nian Omar",
		PhoneNumber: "07722223333",
		Username:    "nian1",
		Password:    "secret123",
	})
	if err != nil {
		t.Fatalf("register cust2 failed: %v", err)
	}

	offer, err := env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Evening Bread Pack",
		Category:          "Bakery",
		OriginalPrice:     10000,
		DiscountedPrice:   4000,
		AvailableQuantity: 5,
		PickupDate:        futurePickupDate(env.cfg.Location),
		PickupStartTime:   "15:00",
		PickupEndTime:     "21:00",
	})
	if err != nil {
		t.Fatalf("CreateOffer failed: %v", err)
	}

	// Over-stock rejected
	_, err = env.resSvc.CreateReservation(cust1.User.ID, dto.CreateReservationRequest{
		OfferID:  offer.ID,
		Quantity: 6,
	})
	assertAppErrorCode(t, err, http.StatusConflict)

	// Customer 1 reserves 3 units
	res1, err := env.resSvc.CreateReservation(cust1.User.ID, dto.CreateReservationRequest{
		OfferID:  offer.ID,
		Quantity: 3,
	})
	if err != nil {
		t.Fatalf("res1 failed: %v", err)
	}
	if res1.UnitPrice != 4000 || res1.TotalPrice != 12000 {
		t.Fatalf("backend price calculation mismatch: unit=%d total=%d", res1.UnitPrice, res1.TotalPrice)
	}

	// Customer 2 reserves remaining 2 units -> offer transitions to Sold Out
	res2, err := env.resSvc.CreateReservation(cust2.User.ID, dto.CreateReservationRequest{
		OfferID:  offer.ID,
		Quantity: 2,
	})
	if err != nil {
		t.Fatalf("res2 failed: %v", err)
	}

	var dbOffer models.Offer
	env.db.First(&dbOffer, offer.ID)
	if dbOffer.AvailableQuantity != 0 || dbOffer.Status != models.OfferStatusSoldOut {
		t.Fatalf("expected Sold Out with qty=0, got status=%s qty=%d", dbOffer.Status, dbOffer.AvailableQuantity)
	}

	// Cannot reserve Sold Out offer
	_, err = env.resSvc.CreateReservation(cust1.User.ID, dto.CreateReservationRequest{
		OfferID:  offer.ID,
		Quantity: 1,
	})
	assertAppErrorCode(t, err, http.StatusConflict)

	// Customer 2 cancels -> stock restored to 2 AND Sold Out recovers to Active
	cancelled2, err := env.resSvc.CancelReservation(cust2.User.ID, res2.ID)
	if err != nil {
		t.Fatalf("cancel res2 failed: %v", err)
	}
	if cancelled2.Status != models.ReservationStatusCancelled {
		t.Fatalf("expected Cancelled status, got %s", cancelled2.Status)
	}

	env.db.First(&dbOffer, offer.ID)
	if dbOffer.AvailableQuantity != 2 || dbOffer.Status != models.OfferStatusActive {
		t.Fatalf("expected Active with qty=2 after cancel recovery, got status=%s qty=%d", dbOffer.Status, dbOffer.AvailableQuantity)
	}

	// Shop owner deactivates offer while res1 is still Active
	if _, err := env.offSvc.DeactivateOffer(shopUser.User.ID, offer.ID); err != nil {
		t.Fatalf("DeactivateOffer failed: %v", err)
	}

	// Existing reservation remains Active
	loadedRes1, err := env.resSvc.GetCustomerReservation(cust1.User.ID, res1.ID)
	if err != nil || loadedRes1.Status != models.ReservationStatusActive {
		t.Fatalf("expected res1 to remain Active after deactivation, got %v / %+v", err, loadedRes1)
	}

	// Customer 1 cancels on Deactivated offer -> stock restores to 5, offer MUST remain Deactivated (Section 7.2)
	if _, err := env.resSvc.CancelReservation(cust1.User.ID, res1.ID); err != nil {
		t.Fatalf("cancel res1 on deactivated offer failed: %v", err)
	}

	env.db.First(&dbOffer, offer.ID)
	if dbOffer.AvailableQuantity != 5 || dbOffer.Status != models.OfferStatusDeactivated {
		t.Fatalf("expected Deactivated offer to stay Deactivated with qty=5, got status=%s qty=%d", dbOffer.Status, dbOffer.AvailableQuantity)
	}
}

func TestConcurrentReservationNoOversell(t *testing.T) {
	env := setupTestEnv(t)

	shopUser, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Hemin Aziz",
		ShopName:      "Azadi Kitchen",
		Category:      "Restaurant",
		ContactNumber: "07703334455",
		Address:       "Tuimelik Street, Sulaymaniyah",
		Username:      "azadi_shop",
		Password:      "secret123",
	})
	if err != nil {
		t.Fatalf("register shop failed: %v", err)
	}

	const stock = 5
	const goroutines = 12

	offer, err := env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Limited Dolma Box",
		Category:          "Restaurant",
		OriginalPrice:     12000,
		DiscountedPrice:   6000,
		AvailableQuantity: stock,
		PickupDate:        futurePickupDate(env.cfg.Location),
		PickupStartTime:   "12:00",
		PickupEndTime:     "20:00",
	})
	if err != nil {
		t.Fatalf("CreateOffer failed: %v", err)
	}

	customerIDs := make([]uint64, goroutines)
	for i := 0; i < goroutines; i++ {
		c, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
			FullName:    "Test Customer",
			PhoneNumber: fmt.Sprintf("07700000%03d", i),
			Username:    fmt.Sprintf("concurrent_cust_%d", i),
			Password:    "secret123",
		})
		if err != nil {
			t.Fatalf("register customer %d failed: %v", i, err)
		}
		customerIDs[i] = c.User.ID
	}

	var successCount atomic.Int32
	var conflictCount atomic.Int32
	var startGate sync.WaitGroup
	var doneWG sync.WaitGroup
	startGate.Add(1)

	for i := 0; i < goroutines; i++ {
		doneWG.Add(1)
		go func(custID uint64) {
			defer doneWG.Done()
			startGate.Wait()
			_, err := env.resSvc.CreateReservation(custID, dto.CreateReservationRequest{
				OfferID:  offer.ID,
				Quantity: 1,
			})
			if err == nil {
				successCount.Add(1)
			} else if appErr, ok := err.(*service.AppError); ok && appErr.Code == http.StatusConflict {
				conflictCount.Add(1)
			} else {
				t.Errorf("unexpected error during concurrent reservation: %v", err)
			}
		}(customerIDs[i])
	}

	startGate.Done()
	doneWG.Wait()

	if successCount.Load() != stock {
		t.Fatalf("expected exactly %d successful reservations, got %d", stock, successCount.Load())
	}
	if conflictCount.Load() != goroutines-stock {
		t.Fatalf("expected %d conflict rejections, got %d", goroutines-stock, conflictCount.Load())
	}

	var dbOffer models.Offer
	env.db.First(&dbOffer, offer.ID)
	if dbOffer.AvailableQuantity != 0 || dbOffer.Status != models.OfferStatusSoldOut {
		t.Fatalf("expected final stock=0 & Sold Out, got qty=%d status=%s", dbOffer.AvailableQuantity, dbOffer.Status)
	}

	var activeSum uint
	env.db.Model(&models.Reservation{}).
		Select("COALESCE(SUM(quantity), 0)").
		Where("offer_id = ? AND status = ?", offer.ID, models.ReservationStatusActive).
		Scan(&activeSum)
	if activeSum != stock {
		t.Fatalf("expected total reserved quantity %d, got %d", stock, activeSum)
	}
}

func TestExpiredOfferAndDeadlineRejection(t *testing.T) {
	env := setupTestEnv(t)

	shopUser, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Lana Sherzad",
		ShopName:      "Chwarchra Cafe",
		Category:      "Café",
		ContactNumber: "07704445566",
		Address:       "Chwarchra, Sulaymaniyah",
		Username:      "chwarchra1",
		Password:      "secret123",
	})
	if err != nil {
		t.Fatalf("register shop failed: %v", err)
	}
	cust, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Zanko Barzan",
		PhoneNumber: "07708889900",
		Username:    "zanko1",
		Password:    "secret123",
	})
	if err != nil {
		t.Fatalf("register cust failed: %v", err)
	}

	offer, err := env.offSvc.CreateOffer(shopUser.User.ID, dto.CreateOfferRequest{
		FoodName:          "Iced Coffee Bundle",
		Category:          "Café",
		OriginalPrice:     6000,
		DiscountedPrice:   3000,
		AvailableQuantity: 4,
		PickupDate:        futurePickupDate(env.cfg.Location),
		PickupStartTime:   "10:00",
		PickupEndTime:     "20:00",
	})
	if err != nil {
		t.Fatalf("CreateOffer failed: %v", err)
	}

	res, err := env.resSvc.CreateReservation(cust.User.ID, dto.CreateReservationRequest{
		OfferID:  offer.ID,
		Quantity: 1,
	})
	if err != nil {
		t.Fatalf("CreateReservation failed: %v", err)
	}

	// Simulate time passing past pickup end time
	pastTime := time.Now().In(env.cfg.Location).Add(-5 * time.Minute)
	if err := env.db.Model(&models.Offer{}).Where("id = ?", offer.ID).Update("pickup_end_at", pastTime).Error; err != nil {
		t.Fatalf("failed to update pickup_end_at: %v", err)
	}

	// Reserving past pickup end time fails and auto-expires offer
	_, err = env.resSvc.CreateReservation(cust.User.ID, dto.CreateReservationRequest{
		OfferID:  offer.ID,
		Quantity: 1,
	})
	assertAppErrorCode(t, err, http.StatusConflict)

	// Cancelling past pickup end time fails and auto-expires reservation
	_, err = env.resSvc.CancelReservation(cust.User.ID, res.ID)
	assertAppErrorCode(t, err, http.StatusConflict)

	var dbOffer models.Offer
	env.db.First(&dbOffer, offer.ID)
	if dbOffer.Status != models.OfferStatusExpired {
		t.Fatalf("expected offer to auto-expire, got %s", dbOffer.Status)
	}
	var dbRes models.Reservation
	env.db.First(&dbRes, res.ID)
	if dbRes.Status != models.ReservationStatusExpired {
		t.Fatalf("expected reservation to auto-expire, got %s", dbRes.Status)
	}
}

func doJSONRequest(engine *gin.Engine, method, path, token string, body any) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	return w
}

func TestRBACAndOwnershipIsolationHTTP(t *testing.T) {
	env := setupTestEnv(t)

	shopA, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Owner One",
		ShopName:      "Bakery Alpha",
		Category:      "Bakery",
		ContactNumber: "07701001001",
		Address:       "Street A, Sulaymaniyah",
		Username:      "shop_a",
		Password:      "secret123",
	})
	if err != nil {
		t.Fatalf("register shopA failed: %v", err)
	}
	shopB, err := env.authSvc.RegisterShopOwner(dto.ShopOwnerRegisterRequest{
		OwnerName:     "Owner Two",
		ShopName:      "Bakery Beta",
		Category:      "Bakery",
		ContactNumber: "07702002002",
		Address:       "Street B, Sulaymaniyah",
		Username:      "shop_b",
		Password:      "secret123",
	})
	if err != nil {
		t.Fatalf("register shopB failed: %v", err)
	}
	custA, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Cust Alpha",
		PhoneNumber: "07703003003",
		Username:    "cust_a",
		Password:    "secret123",
	})
	if err != nil {
		t.Fatalf("register custA failed: %v", err)
	}
	custB, err := env.authSvc.RegisterCustomer(dto.CustomerRegisterRequest{
		FullName:    "Cust Beta",
		PhoneNumber: "07704004004",
		Username:    "cust_b",
		Password:    "secret123",
	})
	if err != nil {
		t.Fatalf("register custB failed: %v", err)
	}

	offerA, err := env.offSvc.CreateOffer(shopA.User.ID, dto.CreateOfferRequest{
		FoodName:          "Alpha Croissant",
		Category:          "Bakery",
		OriginalPrice:     5000,
		DiscountedPrice:   2500,
		AvailableQuantity: 5,
		PickupDate:        futurePickupDate(env.cfg.Location),
		PickupStartTime:   "14:00",
		PickupEndTime:     "20:00",
	})
	if err != nil {
		t.Fatalf("create offerA failed: %v", err)
	}

	resA, err := env.resSvc.CreateReservation(custA.User.ID, dto.CreateReservationRequest{
		OfferID:  offerA.ID,
		Quantity: 1,
	})
	if err != nil {
		t.Fatalf("create resA failed: %v", err)
	}

	// 1. Unauthenticated requests rejected with 401
	if w := doJSONRequest(env.engine, http.MethodGet, "/api/customer/reservations", "", nil); w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated customer route, got %d", w.Code)
	}
	if w := doJSONRequest(env.engine, http.MethodGet, "/api/shop/dashboard", "", nil); w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated shop route, got %d", w.Code)
	}

	// 2. Role mismatch rejected with 403
	if w := doJSONRequest(env.engine, http.MethodGet, "/api/shop/dashboard", custA.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when customer hits shop dashboard, got %d", w.Code)
	}
	if w := doJSONRequest(env.engine, http.MethodGet, "/api/customer/reservations", shopA.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when shop owner hits customer reservations, got %d", w.Code)
	}

	// 3. Cross-customer isolation: Customer B cannot view or cancel Customer A's reservation
	if w := doJSONRequest(env.engine, http.MethodGet, fmt.Sprintf("/api/customer/reservations/%d", resA.ID), custB.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when custB reads custA reservation, got %d", w.Code)
	}
	if w := doJSONRequest(env.engine, http.MethodPost, fmt.Sprintf("/api/customer/reservations/%d/cancel", resA.ID), custB.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when custB cancels custA reservation, got %d", w.Code)
	}

	// 4. Cross-shop isolation: Shop B cannot inspect, deactivate, or view reservations for Shop A
	if w := doJSONRequest(env.engine, http.MethodGet, fmt.Sprintf("/api/shop/offers/%d", offerA.ID), shopB.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when shopB reads shopA offer, got %d", w.Code)
	}
	if w := doJSONRequest(env.engine, http.MethodPost, fmt.Sprintf("/api/shop/offers/%d/deactivate", offerA.ID), shopB.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when shopB deactivates shopA offer, got %d", w.Code)
	}
	if w := doJSONRequest(env.engine, http.MethodGet, fmt.Sprintf("/api/shop/reservations/%d", resA.ID), shopB.Token, nil); w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when shopB views shopA reservation, got %d", w.Code)
	}

	// 5. Legitimate owner & customer access succeeds (200)
	if w := doJSONRequest(env.engine, http.MethodGet, fmt.Sprintf("/api/shop/reservations/%d", resA.ID), shopA.Token, nil); w.Code != http.StatusOK {
		t.Fatalf("expected 200 when shopA views own reservation, got %d: %s", w.Code, w.Body.String())
	}
	if w := doJSONRequest(env.engine, http.MethodGet, fmt.Sprintf("/api/customer/reservations/%d", resA.ID), custA.Token, nil); w.Code != http.StatusOK {
		t.Fatalf("expected 200 when custA views own reservation, got %d: %s", w.Code, w.Body.String())
	}
}

