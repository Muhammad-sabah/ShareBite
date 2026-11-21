package main

import (
	"log"
	"os"
	"time"

	"baqaya-backend/internal/config"
	"baqaya-backend/internal/database"
	"baqaya-backend/internal/repository"
	"baqaya-backend/internal/router"
)

func main() {
	log.Println("[Startup] ShareBite API backend initializing...")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[Startup] Configuration error: %v", err)
	}
	log.Printf("[Startup] Configuration loaded (APP_ENV=%s, Timezone=%s, Port=%s)", cfg.AppEnv, cfg.Timezone, cfg.ServerPort)

	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		log.Fatalf("[Startup] Failed to create uploads directory (%s): %v", cfg.UploadDir, err)
	}

	log.Printf("[Startup] Connecting to database at %s:%s (DB=%s, TLS=%v)...", cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBTLS)
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("[Startup] Database connection failed: %v", err)
	}
	log.Println("[Startup] Database connected successfully.")

	log.Println("[Startup] Checking database migration state...")
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("[Startup] Database migration failed: %v", err)
	}
	log.Println("[Startup] Database migration check completed.")

	if err := database.EnsureAdminUser(db, cfg); err != nil {
		log.Printf("[Startup] Warning: ensure admin user encountered: %v (continuing)", err)
	}

	if err := database.EnsureDemoBeneficiary(db, cfg); err != nil {
		log.Printf("[Startup] Warning: ensure demo beneficiary encountered: %v (continuing)", err)
	}

	if cfg.SeedDemoData {
		log.Println("[Startup] Checking demo data...")
		if err := database.SeedDemoData(db, cfg.Location); err != nil {
			log.Printf("[Startup] Warning: demo data seeding encountered: %v (continuing)", err)
		} else {
			log.Println("[Startup] Demo data check completed.")
		}
	}

	// Sync offer & reservation expiries on startup (FR-LIFE-03)
	repo := repository.New(db)
	if err := repo.SyncExpiries(time.Now().In(cfg.Location)); err != nil {
		log.Printf("[Startup] Warning: initial expiry sync failed: %v", err)
	}

	r := router.Setup(cfg, db)
	addr := ":" + cfg.ServerPort
	log.Printf("[Startup] ShareBite API server running on port %s (env=%s, tz=%s)", cfg.ServerPort, cfg.AppEnv, cfg.Timezone)

	if err := r.Run(addr); err != nil {
		log.Fatalf("[Startup] Server failed to start: %v", err)
	}
}
