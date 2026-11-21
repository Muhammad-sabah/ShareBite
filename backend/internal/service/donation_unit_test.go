package service_test

import (
	"testing"
	"time"

	"baqaya-backend/internal/models"
	"baqaya-backend/internal/util"
)

func TestDonationModelStatuses(t *testing.T) {
	if models.RoleAdmin != "admin" {
		t.Fatalf("expected admin role to be 'admin', got %s", models.RoleAdmin)
	}
	if models.RoleBeneficiary != "beneficiary" {
		t.Fatalf("expected beneficiary role to be 'beneficiary', got %s", models.RoleBeneficiary)
	}
	if models.BeneficiaryStatusPending != "Pending" || models.BeneficiaryStatusApproved != "Approved" {
		t.Fatalf("unexpected beneficiary statuses")
	}
	if models.DonationStatusActive != "Active" || models.DonationStatusFullyClaimed != "Fully Claimed" {
		t.Fatalf("unexpected donation statuses")
	}
	if models.ClaimStatusActive != "Active" || models.ClaimStatusFulfilled != "Fulfilled" {
		t.Fatalf("unexpected claim statuses")
	}
}

func TestDonationScheduleValidation(t *testing.T) {
	loc := time.FixedZone("Asia/Baghdad", 3*60*60)
	now := time.Date(2026, 11, 21, 12, 0, 0, 0, loc)

	// Past pickup date
	_, _, err := util.ParsePickupSchedule("2026-11-20", "14:00", "16:00", now, loc)
	if err == nil {
		t.Fatal("expected error for past pickup date, got nil")
	}

	// Valid future schedule
	startAt, endAt, err := util.ParsePickupSchedule("2026-11-22", "14:00", "18:00", now, loc)
	if err != nil {
		t.Fatalf("unexpected error for valid schedule: %v", err)
	}
	if !endAt.After(startAt) {
		t.Fatal("endAt must be after startAt")
	}
}
