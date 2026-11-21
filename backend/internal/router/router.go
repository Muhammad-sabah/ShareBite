package router

import (
	"net/http"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/handler"
	"baqaya-backend/internal/middleware"
	"baqaya-backend/internal/models"
	"baqaya-backend/internal/repository"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(cfg *config.Config, db *gorm.DB) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))

	// Serve uploaded food images
	r.Static("/uploads", cfg.UploadDir)

	// Health check handlers for both /health and /api/health
	healthHandler := func(c *gin.Context) {
		sqlDB, err := db.DB()
		dbStatus := "connected"
		if err != nil || sqlDB.Ping() != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "degraded",
				"service": "sharebite-api",
				"db":      "error",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "sharebite-api",
			"db":      dbStatus,
		})
	}
	r.GET("/health", healthHandler)

	repo := repository.New(db)
	authSvc := service.NewAuthService(repo, cfg)
	offerSvc := service.NewOfferService(repo, cfg)
	resSvc := service.NewReservationService(repo, cfg)
	benSvc := service.NewBeneficiaryService(repo, cfg)
	donationSvc := service.NewDonationService(repo, cfg)

	authHandler := handler.NewAuthHandler(authSvc)
	offerHandler := handler.NewOfferHandler(offerSvc)
	resHandler := handler.NewReservationHandler(resSvc)
	uploadHandler := handler.NewUploadHandler(cfg.UploadDir)
	benHandler := handler.NewBeneficiaryHandler(benSvc)
	donationHandler := handler.NewDonationHandler(donationSvc)

	authLimiter := middleware.NewRateLimiter(40)

	api := r.Group("/api")
	{
		api.GET("/health", healthHandler)

		// Public auth endpoints (rate-limited)
		auth := api.Group("/auth")
		{
			auth.POST("/register/customer", authLimiter.Middleware(), authHandler.RegisterCustomer)
			auth.POST("/register/shop-owner", authLimiter.Middleware(), authHandler.RegisterShopOwner)
			auth.POST("/register/beneficiary", authLimiter.Middleware(), authHandler.RegisterBeneficiary)
			auth.POST("/login", authLimiter.Middleware(), authHandler.Login)
			auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authHandler.Me)
		}

		// Public / Marketplace offer browsing
		api.GET("/offers", offerHandler.ListMarketplace)
		api.GET("/offers/:id", offerHandler.GetMarketplaceDetail)

		// Customer-only endpoints
		customer := api.Group("/customer")
		customer.Use(middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(models.RoleCustomer))
		{
			customer.GET("/reservations", resHandler.ListCustomerReservations)
			customer.POST("/reservations", resHandler.CreateReservation)
			customer.GET("/reservations/:id", resHandler.GetCustomerReservationDetail)
			customer.POST("/reservations/:id/cancel", resHandler.CancelReservation)
		}

		// Shop Owner-only endpoints (Also Food Donors)
		shop := api.Group("/shop")
		shop.Use(middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(models.RoleShopOwner))
		{
			shop.GET("/dashboard", resHandler.GetShopDashboard)
			shop.PUT("/profile", authHandler.UpdateShopProfile)

			// Marketplace Offers
			shop.GET("/offers", offerHandler.ListShopOffers)
			shop.POST("/offers", offerHandler.CreateOffer)
			shop.GET("/offers/:id", offerHandler.GetShopOfferDetail)
			shop.POST("/offers/:id/deactivate", offerHandler.DeactivateOffer)

			// Marketplace Reservations
			shop.GET("/reservations", resHandler.ListShopReservations)
			shop.GET("/reservations/:id", resHandler.GetShopReservationDetail)

			// Food Donations (Free surplus food)
			shop.POST("/donations", donationHandler.CreateDonation)
			shop.GET("/donations", donationHandler.ListShopDonations)
			shop.GET("/donations/:id", donationHandler.GetShopDonationDetail)
			shop.POST("/donations/:id/cancel", donationHandler.CancelDonation)

			// Food Donation Claims & Fulfillment
			shop.GET("/donations/claims", donationHandler.ListShopClaims)
			shop.POST("/donations/claims/:id/fulfill", donationHandler.FulfillClaim)

			shop.POST("/uploads", uploadHandler.UploadFoodImage)
		}

		// Beneficiary-only endpoints (Protected)
		beneficiary := api.Group("/beneficiary")
		beneficiary.Use(middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(models.RoleBeneficiary))
		{
			beneficiary.GET("/profile", benHandler.GetBeneficiaryProfile)

			// Food Donation Browsing & Claiming
			beneficiary.GET("/donations", donationHandler.ListBeneficiaryDonations)
			beneficiary.GET("/donations/:id", donationHandler.GetBeneficiaryDonationDetail)
			beneficiary.POST("/donations/:id/claim", donationHandler.ClaimDonation)

			// Claims Tracking & Cancellation
			beneficiary.GET("/claims", donationHandler.ListBeneficiaryClaims)
			beneficiary.POST("/claims/:id/cancel", donationHandler.CancelBeneficiaryClaim)
		}

		// Admin-only endpoints (Protected)
		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(models.RoleAdmin))
		{
			// Beneficiary Application Oversight & Verification
			admin.GET("/beneficiaries", benHandler.ListAdminBeneficiaries)
			admin.POST("/beneficiaries/:id/verify", benHandler.VerifyBeneficiary)
			admin.POST("/beneficiaries", benHandler.AdminCreateBeneficiary)
			admin.POST("/beneficiaries/referral", benHandler.AdminCreateBeneficiary)

			// Donations Audit Overview
			admin.GET("/donations", donationHandler.GetAdminOverview)
			admin.GET("/donations/overview", donationHandler.GetAdminOverview)
		}
	}

	return r
}
