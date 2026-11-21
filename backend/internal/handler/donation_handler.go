package handler

import (
	"net/http"
	"strconv"

	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type DonationHandler struct {
	donationSvc *service.DonationService
}

func NewDonationHandler(donationSvc *service.DonationService) *DonationHandler {
	return &DonationHandler{donationSvc: donationSvc}
}

// ---- Shop Owner / Donor Endpoints ----

func (h *DonationHandler) CreateDonation(c *gin.Context) {
	var req dto.CreateDonationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter valid values for the donation listing."})
		return
	}

	ownerID := currentUserID(c)
	donation, err := h.donationSvc.CreateDonation(ownerID, req)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Food donation published successfully.",
		"donation": donation,
	})
}

func (h *DonationHandler) ListShopDonations(c *gin.Context) {
	ownerID := currentUserID(c)
	donations, err := h.donationSvc.ListShopDonations(ownerID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"donations": donations})
}

func (h *DonationHandler) GetShopDonationDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid donation ID."})
		return
	}

	ownerID := currentUserID(c)
	donation, err := h.donationSvc.GetShopDonationDetail(ownerID, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"donation": donation})
}

func (h *DonationHandler) CancelDonation(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid donation ID."})
		return
	}

	ownerID := currentUserID(c)
	if err := h.donationSvc.CancelDonation(ownerID, id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Donation cancelled successfully."})
}

func (h *DonationHandler) ListShopClaims(c *gin.Context) {
	ownerID := currentUserID(c)
	claims, err := h.donationSvc.ListShopClaims(ownerID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"claims": claims})
}

func (h *DonationHandler) FulfillClaim(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid claim ID."})
		return
	}

	var req dto.FulfillClaimRequest
	_ = c.ShouldBindJSON(&req)

	ownerID := currentUserID(c)
	claim, err := h.donationSvc.FulfillClaim(ownerID, id, req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Claim fulfillment confirmed successfully.",
		"claim":   claim,
	})
}

// ---- Beneficiary Endpoints ----

func (h *DonationHandler) ListBeneficiaryDonations(c *gin.Context) {
	category := c.Query("category")
	donations, err := h.donationSvc.ListActiveDonationsForBeneficiaries(category)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"donations": donations})
}

func (h *DonationHandler) GetBeneficiaryDonationDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid donation ID."})
		return
	}

	donation, err := h.donationSvc.GetDonationDetail(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"donation": donation})
}

func (h *DonationHandler) ClaimDonation(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid donation ID."})
		return
	}

	var req dto.CreateClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter valid claim parameters."})
		return
	}
	req.DonationID = id

	beneficiaryID := currentUserID(c)
	claim, err := h.donationSvc.ClaimDonation(beneficiaryID, req)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Food donation reserved successfully! Present your claim code at pickup.",
		"claim":   claim,
	})
}

func (h *DonationHandler) ListBeneficiaryClaims(c *gin.Context) {
	beneficiaryID := currentUserID(c)
	claims, err := h.donationSvc.ListBeneficiaryClaims(beneficiaryID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"claims": claims})
}

func (h *DonationHandler) CancelBeneficiaryClaim(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid claim ID."})
		return
	}

	beneficiaryID := currentUserID(c)
	if err := h.donationSvc.CancelBeneficiaryClaim(id, beneficiaryID); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Donation claim cancelled successfully."})
}

// ---- Admin Overview Endpoint ----

func (h *DonationHandler) GetAdminOverview(c *gin.Context) {
	overview, err := h.donationSvc.GetAdminOverview()
	if err != nil {
		respondError(c, err)
		return
	}
	donations, _ := h.donationSvc.ListAllDonationsForAdmin()
	claims, _ := h.donationSvc.ListAllClaimsForAdmin()
	c.JSON(http.StatusOK, gin.H{
		"overview":         overview,
		"recent_donations": donations,
		"recent_claims":    claims,
	})
}
