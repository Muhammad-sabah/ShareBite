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

	repo := repository.New(db)
	authSvc := service.NewAuthService(repo, cfg)
	offerSvc := service.NewOfferService(repo, cfg)
	resSvc := service.NewReservationService(repo, cfg)

	authHandler := handler.NewAuthHandler(authSvc)
	offerHandler := handler.NewOfferHandler(offerSvc)
	resHandler := handler.NewReservationHandler(resSvc)
	uploadHandler := handler.NewUploadHandler(cfg.UploadDir)

	authLimiter := middleware.NewRateLimiter(40)

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			sqlDB, err := db.DB()
			dbStatus := "connected"
			if err != nil || sqlDB.Ping() != nil {
				dbStatus = "error"
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status":  "degraded",
					"service": "baqaya-api",
					"db":      dbStatus,
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"status":  "ok",
				"service": "baqaya-api",
				"db":      dbStatus,
			})
		})

		// Public auth endpoints (rate-limited)
		auth := api.Group("/auth")
		{
			auth.POST("/register/customer", authLimiter.Middleware(), authHandler.RegisterCustomer)
			auth.POST("/register/shop-owner", authLimiter.Middleware(), authHandler.RegisterShopOwner)
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

		// Shop Owner-only endpoints
		shop := api.Group("/shop")
		shop.Use(middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(models.RoleShopOwner))
		{
			shop.GET("/dashboard", resHandler.GetShopDashboard)
			shop.PUT("/profile", authHandler.UpdateShopProfile)

			shop.GET("/offers", offerHandler.ListShopOffers)
			shop.POST("/offers", offerHandler.CreateOffer)
			shop.GET("/offers/:id", offerHandler.GetShopOfferDetail)
			shop.POST("/offers/:id/deactivate", offerHandler.DeactivateOffer)

			shop.GET("/reservations", resHandler.ListShopReservations)
			shop.GET("/reservations/:id", resHandler.GetShopReservationDetail)

			shop.POST("/uploads", uploadHandler.UploadFoodImage)
		}
	}

	return r
}

