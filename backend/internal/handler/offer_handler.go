package handler

import (
	"net/http"
	"strconv"

	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type OfferHandler struct {
	offerSvc *service.OfferService
}

func NewOfferHandler(offerSvc *service.OfferService) *OfferHandler {
	return &OfferHandler{offerSvc: offerSvc}
}

// Public / Customer Marketplace endpoints
func (h *OfferHandler) ListMarketplace(c *gin.Context) {
	search := c.Query("search")
	category := c.Query("category")
	sortBy := c.Query("sort")

	offers, err := h.offerSvc.ListMarketplaceOffers(search, category, sortBy)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"offers": offers})
}

func (h *OfferHandler) GetMarketplaceDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid offer ID."})
		return
	}

	offer, err := h.offerSvc.GetMarketplaceOffer(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"offer": offer})
}

// Shop Owner endpoints
func (h *OfferHandler) CreateOffer(c *gin.Context) {
	var req dto.CreateOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter valid whole numbers for prices and quantity."})
		return
	}

	offer, err := h.offerSvc.CreateOffer(currentUserID(c), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"offer": offer, "message": "Food offer created successfully!"})
}

func (h *OfferHandler) ListShopOffers(c *gin.Context) {
	statusFilter := c.Query("status")
	offers, err := h.offerSvc.ListShopOffers(currentUserID(c), statusFilter)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"offers": offers})
}

func (h *OfferHandler) GetShopOfferDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid offer ID."})
		return
	}

	offer, err := h.offerSvc.GetShopOfferDetail(currentUserID(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"offer": offer})
}

func (h *OfferHandler) DeactivateOffer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid offer ID."})
		return
	}

	offer, err := h.offerSvc.DeactivateOffer(currentUserID(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"offer":   offer,
		"message": "Offer has been permanently deactivated.",
	})
}

