package config

import (
	"os"
	"strings"
	"testing"
)

func TestDSNWithoutTLS(t *testing.T) {
	cfg := &Config{
		DBUser:     "root",
		DBPassword: "secretpassword",
		DBHost:     "127.0.0.1",
		DBPort:     "3306",
		DBName:     "baqaya",
		DBTLS:      false,
	}

	dsn := cfg.DSN()
	expected := "root:secretpassword@tcp(127.0.0.1:3306)/baqaya?charset=utf8mb4&parseTime=True&loc=Local"
	if dsn != expected {
		t.Fatalf("expected %q, got %q", expected, dsn)
	}
	if strings.Contains(dsn, "tls=true") {
		t.Fatalf("expected no tls parameter in DSN, got %q", dsn)
	}
}

func TestDSNWithTLS(t *testing.T) {
	cfg := &Config{
		DBUser:     "user.root",
		DBPassword: "secretpassword",
		DBHost:     "gateway01.us-east-1.prod.aws.tidbcloud.com",
		DBPort:     "4000",
		DBName:     "sharebite",
		DBTLS:      true,
	}

	dsn := cfg.DSN()
	expected := "user.root:secretpassword@tcp(gateway01.us-east-1.prod.aws.tidbcloud.com:4000)/sharebite?charset=utf8mb4&parseTime=True&loc=Local&tls=true"
	if dsn != expected {
		t.Fatalf("expected %q, got %q", expected, dsn)
	}
	if !strings.HasSuffix(dsn, "&tls=true") {
		t.Fatalf("expected DSN to end with &tls=true, got %q", dsn)
	}
}

func TestLoadDBTLSDefault(t *testing.T) {
	_ = os.Unsetenv("DB_TLS")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error loading config: %v", err)
	}
	if cfg.DBTLS != false {
		t.Fatalf("expected DBTLS to default to false, got %v", cfg.DBTLS)
	}
}

func TestLoadDBTLSTrue(t *testing.T) {
	_ = os.Setenv("DB_TLS", "true")
	defer func() { _ = os.Unsetenv("DB_TLS") }()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error loading config: %v", err)
	}
	if cfg.DBTLS != true {
		t.Fatalf("expected DBTLS to be true, got %v", cfg.DBTLS)
	}
}
