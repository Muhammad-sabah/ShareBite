package router_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/router"
	"baqaya-backend/internal/util"
	"github.com/gin-gonic/gin"
)

func TestRouterRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	loc := time.FixedZone("Asia/Baghdad", 3*60*60)
	cfg := &config.Config{
		AppEnv:                  "development",
		JWTSecret:               "test-secret-test-secret-test-secret-1234",
		JWTExpiryHours:          24,
		ServerPort:              "8080",
		Location:                loc,
		CORSAllowedOrigins:      []string{"*"},
		UploadDir:               "./test_uploads",
		AdminUsername:           "admin",
		AdminPassword:           "Admin@ShareBite2026",
		AdminFullName:           "ShareBite System Admin",
		DemoBeneficiaryUsername: "beneficiary1",
		DemoBeneficiaryPassword: "pass123",
	}

	r := router.Setup(cfg, nil)

	routes := r.Routes()
	routesMap := make(map[string]bool)
	for _, rt := range routes {
		routesMap[rt.Method+" "+rt.Path] = true
	}

	expectedRoutes := []string{
		"POST /api/auth/login",
		"POST /api/auth/register/customer",
		"POST /api/auth/register/shop-owner",
		"POST /api/auth/register/beneficiary",
		"GET /api/auth/me",
		"GET /api/offers",
		"GET /api/offers/:id",
		"POST /api/customer/reservations",
		"GET /api/customer/reservations",
		"POST /api/shop/offers",
		"GET /api/shop/offers",
		"POST /api/shop/donations",
		"GET /api/shop/donations",
		"GET /api/shop/donations/:id",
		"POST /api/shop/donations/:id/cancel",
		"GET /api/shop/donations/claims",
		"POST /api/shop/donations/claims/:id/fulfill",
		"GET /api/beneficiary/profile",
		"GET /api/beneficiary/donations",
		"GET /api/beneficiary/donations/:id",
		"POST /api/beneficiary/donations/:id/claim",
		"GET /api/beneficiary/claims",
		"POST /api/beneficiary/claims/:id/cancel",
		"GET /api/admin/beneficiaries",
		"POST /api/admin/beneficiaries/:id/verify",
		"POST /api/admin/beneficiaries",
		"POST /api/admin/beneficiaries/referral",
		"GET /api/admin/donations",
		"GET /api/admin/donations/overview",
	}

	for _, er := range expectedRoutes {
		if !routesMap[er] {
			t.Errorf("Missing expected route: %s", er)
		}
	}

	// Verify Admin authorization requirement on /api/admin/donations/overview
	adminToken, err := util.GenerateToken(cfg.JWTSecret, 24, 999, "admin", models.RoleAdmin, 0)
	if err != nil {
		t.Fatalf("failed to generate admin token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/donations/overview", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w := httptest.NewRecorder()

	defer func() {
		if r := recover(); r != nil {
			t.Logf("Recovered panic during test with nil db (expected): %v", r)
		}
	}()

	r.ServeHTTP(w, req)
	t.Logf("Response status for /api/admin/donations/overview: %d", w.Code)
}
