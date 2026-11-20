package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all environment-driven configuration for the Baqaya backend.
type Config struct {
	AppEnv             string
	ServerPort         string
	Timezone           string
	Location           *time.Location
	CORSAllowedOrigins []string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	JWTSecret      string
	JWTExpiryHours int
	SeedDemoData   bool
	UploadDir      string
}

// Load reads configuration from .env (if present) and process environment variables.
func Load() (*Config, error) {
	// Load .env if present; ignore missing file in production where env vars are injected.
	_ = godotenv.Load()

	tz := getEnv("TZ", "Asia/Baghdad")
	loc, err := time.LoadLocation(tz)
	if err != nil {
		// Fallback to fixed +03:00 (Sulaymaniyah / Baghdad standard time) if tzdata is missing on Windows.
		loc = time.FixedZone("Asia/Baghdad", 3*60*60)
	}
	time.Local = loc

	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil || expiryHours <= 0 {
		expiryHours = 24
	}

	seedDemo := strings.EqualFold(getEnv("SEED_DEMO_DATA", "true"), "true")

	originsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
	var origins []string
	for _, o := range strings.Split(originsRaw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	appEnv := getEnv("APP_ENV", "development")
	if jwtSecret == "" {
		if appEnv == "production" {
			return nil, fmt.Errorf("JWT_SECRET environment variable must be set in production")
		}
		jwtSecret = "baqaya-dev-fallback-secret-set-JWT_SECRET-in-env"
	}

	return &Config{
		AppEnv:             appEnv,
		ServerPort:         getEnv("PORT", getEnv("SERVER_PORT", "8080")),
		Timezone:           tz,
		Location:           loc,
		CORSAllowedOrigins: origins,
		DBHost:             getEnv("DB_HOST", "127.0.0.1"),
		DBPort:             getEnv("DB_PORT", "3306"),
		DBUser:             getEnv("DB_USER", "root"),
		DBPassword:         os.Getenv("DB_PASSWORD"),
		DBName:             getEnv("DB_NAME", "baqaya"),
		JWTSecret:          jwtSecret,
		JWTExpiryHours:     expiryHours,
		SeedDemoData:       seedDemo,
		UploadDir:          getEnv("UPLOAD_DIR", "uploads"),
	}, nil
}

// DSN builds the MySQL connection string for GORM.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
	)
}

func getEnv(key, fallback string) string {
	if val := strings.TrimSpace(os.Getenv(key)); val != "" {
		return val
	}
	return fallback
}

