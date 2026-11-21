package handler

import (
	"net/http"
	"strconv"

	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type BeneficiaryHandler struct {
	benSvc *service.BeneficiaryService
}

func NewBeneficiaryHandler(benSvc *service.BeneficiaryService) *BeneficiaryHandler {
	return &BeneficiaryHandler{benSvc: benSvc}
}

// Admin endpoints

func (h *BeneficiaryHandler) ListAdminBeneficiaries(c *gin.Context) {
	statusFilter := c.Query("status")
	profiles, err := h.benSvc.ListBeneficiaries(statusFilter)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiaries": profiles})
}

func (h *BeneficiaryHandler) VerifyBeneficiary(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid beneficiary application ID."})
		return
	}

	var req dto.VerifyBeneficiaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification payload."})
		return
	}

	adminID := currentUserID(c)
	profile, err := h.benSvc.VerifyBeneficiary(id, adminID, req)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Beneficiary verification updated successfully.",
		"beneficiary": profile,
	})
}

func (h *BeneficiaryHandler) AdminCreateBeneficiary(c *gin.Context) {
	var req dto.AdminCreateBeneficiaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload."})
		return
	}

	adminID := currentUserID(c)
	profile, err := h.benSvc.AdminCreateBeneficiary(adminID, req)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Partner referral beneficiary registered successfully.",
		"beneficiary": profile,
	})
}

// Beneficiary self endpoint

func (h *BeneficiaryHandler) GetBeneficiaryProfile(c *gin.Context) {
	userID := currentUserID(c)
	profile, err := h.benSvc.GetBeneficiaryProfile(userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"beneficiary": profile})
}
