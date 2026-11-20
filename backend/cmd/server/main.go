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
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	if cfg.SeedDemoData {
		if err := database.SeedDemoData(db, cfg.Location); err != nil {
			log.Fatalf("Demo data seeding failed: %v", err)
		}
	}

	// Sync offer & reservation expiries on startup (FR-LIFE-03)
	repo := repository.New(db)
	if err := repo.SyncExpiries(time.Now().In(cfg.Location)); err != nil {
		log.Printf("Warning: initial expiry sync failed: %v", err)
	}

	r := router.Setup(cfg, db)
	addr := ":" + cfg.ServerPort
	log.Printf("Baqaya API server starting on http://localhost%s (env=%s, tz=%s)", addr, cfg.AppEnv, cfg.Timezone)

	if err := r.Run(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

