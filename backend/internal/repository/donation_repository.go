package repository

import (
	"errors"
	"fmt"
	"time"

	"baqaya-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ---- Beneficiary Repository Methods ----

func (r *Repository) CreateBeneficiaryWithProfile(user *models.User, profile *models.BeneficiaryProfile) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		profile.UserID = user.ID
		return tx.Create(profile).Error
	})
}

func (r *Repository) FindBeneficiaryProfileByUserID(userID uint64) (*models.BeneficiaryProfile, error) {
	var profile models.BeneficiaryProfile
	err := r.db.Preload("User").Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *Repository) FindBeneficiaryProfileByID(profileID uint64) (*models.BeneficiaryProfile, error) {
	var profile models.BeneficiaryProfile
	err := r.db.Preload("User").Where("id = ?", profileID).First(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *Repository) ListBeneficiaryProfiles(statusFilter string) ([]models.BeneficiaryProfile, error) {
	var profiles []models.BeneficiaryProfile
	query := r.db.Preload("User").Order("created_at DESC")
	if statusFilter != "" && statusFilter != "All" {
		query = query.Where("verification_status = ?", statusFilter)
	}
	err := query.Find(&profiles).Error
	return profiles, err
}

func (r *Repository) UpdateBeneficiaryVerification(profileID uint64, status, rejectionReason string, verifiedBy uint64, verifiedAt time.Time) (*models.BeneficiaryProfile, error) {
	var profile models.BeneficiaryProfile
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", profileID).First(&profile).Error; err != nil {
			return err
		}
		profile.VerificationStatus = status
		profile.RejectionReason = rejectionReason
		profile.VerifiedBy = &verifiedBy
		profile.VerifiedAt = &verifiedAt
		return tx.Save(&profile).Error
	})
	if err != nil {
		return nil, err
	}
	_ = r.db.Preload("User").First(&profile, profileID)
	return &profile, nil
}

func (r *Repository) CountBeneficiariesByStatus() (int64, int64, int64, error) {
	var total, pending, approved int64
	if err := r.db.Model(&models.BeneficiaryProfile{}).Count(&total).Error; err != nil {
		return 0, 0, 0, err
	}
	_ = r.db.Model(&models.BeneficiaryProfile{}).Where("verification_status = ?", models.BeneficiaryStatusPending).Count(&pending).Error
	_ = r.db.Model(&models.BeneficiaryProfile{}).Where("verification_status = ?", models.BeneficiaryStatusApproved).Count(&approved).Error
	return total, pending, approved, nil
}

// ---- Food Donation Repository Methods ----

func (r *Repository) CreateDonation(d *models.FoodDonation) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.FoodDonation{}).Count(&count).Error; err != nil {
			return err
		}
		d.DonationCode = fmt.Sprintf("DON-%04d", count+1)
		return tx.Create(d).Error
	})
}

func (r *Repository) FindDonationByID(id uint64) (*models.FoodDonation, error) {
	var d models.FoodDonation
	err := r.db.Preload("Shop").Where("id = ?", id).First(&d).Error
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *Repository) ListActiveDonations(now time.Time, category string) ([]models.FoodDonation, error) {
	var donations []models.FoodDonation
	query := r.db.Preload("Shop").
		Where("status = ? AND pickup_end_at > ? AND available_quantity > 0", models.DonationStatusActive, now).
		Order("pickup_end_at ASC")

	if category != "" && category != "All" {
		query = query.Where("category = ?", category)
	}

	err := query.Find(&donations).Error
	return donations, err
}

func (r *Repository) ListDonationsByShop(shopID uint64) ([]models.FoodDonation, error) {
	var donations []models.FoodDonation
	err := r.db.Preload("Shop").
		Where("shop_id = ?", shopID).
		Order("created_at DESC").
		Find(&donations).Error
	return donations, err
}

func (r *Repository) CancelDonation(shopID, donationID uint64) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var donation models.FoodDonation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND shop_id = ?", donationID, shopID).
			First(&donation).Error; err != nil {
			return err
		}
		if donation.Status == models.DonationStatusCancelled {
			return errors.New("donation is already cancelled")
		}
		donation.Status = models.DonationStatusCancelled
		return tx.Save(&donation).Error
	})
}

func (r *Repository) CountActiveClaimsByDonation(donationID uint64) (int64, error) {
	var count int64
	err := r.db.Model(&models.DonationClaim{}).
		Where("donation_id = ? AND status = ?", donationID, models.ClaimStatusActive).
		Count(&count).Error
	return count, err
}

func (r *Repository) CountActiveClaimsMapForShop(shopID uint64) (map[uint64]int64, error) {
	type row struct {
		DonationID uint64 `gorm:"column:donation_id"`
		Total      int64  `gorm:"column:total"`
	}
	var rows []row
	err := r.db.Model(&models.DonationClaim{}).
		Select("donation_claims.donation_id, count(*) as total").
		Joins("JOIN food_donations ON food_donations.id = donation_claims.donation_id").
		Where("food_donations.shop_id = ? AND donation_claims.status = ?", shopID, models.ClaimStatusActive).
		Group("donation_claims.donation_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	m := make(map[uint64]int64, len(rows))
	for _, r := range rows {
		m[r.DonationID] = r.Total
	}
	return m, nil
}

func (r *Repository) SyncDonationExpiries(now time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Expire past active donations
		if err := tx.Model(&models.FoodDonation{}).
			Where("status = ? AND pickup_end_at <= ?", models.DonationStatusActive, now).
			Update("status", models.DonationStatusExpired).Error; err != nil {
			return err
		}

		// 2. Expire active claims on past donations
		subQuery := tx.Model(&models.FoodDonation{}).Select("id").Where("pickup_end_at <= ?", now)
		if err := tx.Model(&models.DonationClaim{}).
			Where("status = ? AND donation_id IN (?)", models.ClaimStatusActive, subQuery).
			Update("status", models.ClaimStatusExpired).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *Repository) CountDonationStats() (int64, int64, int64, int64, error) {
	var totalDonations, activeDonations, totalClaims, fulfilledClaims int64
	_ = r.db.Model(&models.FoodDonation{}).Count(&totalDonations).Error
	_ = r.db.Model(&models.FoodDonation{}).Where("status = ?", models.DonationStatusActive).Count(&activeDonations).Error
	_ = r.db.Model(&models.DonationClaim{}).Count(&totalClaims).Error
	_ = r.db.Model(&models.DonationClaim{}).Where("status = ?", models.ClaimStatusFulfilled).Count(&fulfilledClaims).Error
	return totalDonations, activeDonations, totalClaims, fulfilledClaims, nil
}

// ---- Donation Claims Repository Methods ----

func (r *Repository) CreateClaimTx(beneficiaryID uint64, donationID uint64, quantity uint, deliveryReq bool, deliveryAddr, deliveryNotes string, now time.Time) (*models.DonationClaim, error) {
	var claim models.DonationClaim
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var donation models.FoodDonation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", donationID).
			First(&donation).Error; err != nil {
			return err
		}

		if donation.Status != models.DonationStatusActive {
			return errors.New("this donation is no longer active")
		}

		if donation.PickupEndAt.Before(now) {
			return errors.New("this donation window has already expired")
		}

		if donation.AvailableQuantity < quantity {
			return fmt.Errorf("insufficient quantity available: requested %d, but only %d remaining", quantity, donation.AvailableQuantity)
		}

		// Deduct available stock
		donation.AvailableQuantity -= quantity
		if donation.AvailableQuantity == 0 {
			donation.Status = models.DonationStatusFullyClaimed
		}
		if err := tx.Save(&donation).Error; err != nil {
			return err
		}

		var count int64
		if err := tx.Model(&models.DonationClaim{}).Count(&count).Error; err != nil {
			return err
		}

		claim = models.DonationClaim{
			ClaimCode:         fmt.Sprintf("CLM-%04d", count+1),
			DonationID:        donationID,
			BeneficiaryID:     beneficiaryID,
			Quantity:          quantity,
			DeliveryRequested: deliveryReq,
			DeliveryAddress:   deliveryAddr,
			DeliveryNotes:     deliveryNotes,
			Status:            models.ClaimStatusActive,
		}

		return tx.Create(&claim).Error
	})
	if err != nil {
		return nil, err
	}

	_ = r.db.Preload("Donation.Shop").Preload("Beneficiary").First(&claim, claim.ID)
	return &claim, nil
}

func (r *Repository) FindClaimByID(id uint64) (*models.DonationClaim, error) {
	var claim models.DonationClaim
	err := r.db.Preload("Donation.Shop").Preload("Beneficiary").Where("id = ?", id).First(&claim).Error
	if err != nil {
		return nil, err
	}
	return &claim, nil
}

func (r *Repository) ListClaimsByBeneficiary(beneficiaryID uint64) ([]models.DonationClaim, error) {
	var claims []models.DonationClaim
	err := r.db.Preload("Donation.Shop").
		Where("beneficiary_id = ?", beneficiaryID).
		Order("created_at DESC").
		Find(&claims).Error
	return claims, err
}

func (r *Repository) ListClaimsByShop(shopID uint64) ([]models.DonationClaim, error) {
	var claims []models.DonationClaim
	err := r.db.Preload("Donation").Preload("Beneficiary").
		Joins("JOIN food_donations ON food_donations.id = donation_claims.donation_id").
		Where("food_donations.shop_id = ?", shopID).
		Order("donation_claims.created_at DESC").
		Find(&claims).Error
	return claims, err
}

func (r *Repository) CancelClaimTx(claimID, beneficiaryID uint64, now time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var claim models.DonationClaim
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND beneficiary_id = ?", claimID, beneficiaryID).
			First(&claim).Error; err != nil {
			return err
		}

		if claim.Status != models.ClaimStatusActive {
			return fmt.Errorf("claim is not active and cannot be cancelled (current status: %s)", claim.Status)
		}

		var donation models.FoodDonation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", claim.DonationID).
			First(&donation).Error; err != nil {
			return err
		}

		// Restore quantity
		donation.AvailableQuantity += claim.Quantity
		if donation.Status == models.DonationStatusFullyClaimed && donation.PickupEndAt.After(now) {
			donation.Status = models.DonationStatusActive
		}
		if err := tx.Save(&donation).Error; err != nil {
			return err
		}

		claim.Status = models.ClaimStatusCancelled
		return tx.Save(&claim).Error
	})
}

func (r *Repository) FulfillClaim(claimID, shopID uint64, fulfillmentNotes string, now time.Time) (*models.DonationClaim, error) {
	var claim models.DonationClaim
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", claimID).
			First(&claim).Error; err != nil {
			return err
		}

		var donation models.FoodDonation
		if err := tx.Where("id = ? AND shop_id = ?", claim.DonationID, shopID).First(&donation).Error; err != nil {
			return errors.New("unauthorized: this claim does not belong to your shop's donation")
		}

		if claim.Status != models.ClaimStatusActive {
			return fmt.Errorf("cannot fulfill claim with status %s", claim.Status)
		}

		claim.Status = models.ClaimStatusFulfilled
		claim.FulfilledAt = &now
		claim.FulfillmentNotes = fulfillmentNotes
		return tx.Save(&claim).Error
	})
	if err != nil {
		return nil, err
	}

	_ = r.db.Preload("Donation.Shop").Preload("Beneficiary").First(&claim, claim.ID)
	return &claim, nil
}

func (r *Repository) ListAllDonations() ([]models.FoodDonation, error) {
	var donations []models.FoodDonation
	err := r.db.Preload("Shop").Order("created_at DESC").Find(&donations).Error
	return donations, err
}

func (r *Repository) ListAllClaims() ([]models.DonationClaim, error) {
	var claims []models.DonationClaim
	err := r.db.Preload("Donation.Shop").Preload("Beneficiary").Order("created_at DESC").Find(&claims).Error
	return claims, err
}
