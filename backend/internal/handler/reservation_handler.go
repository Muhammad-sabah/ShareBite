package handler

import (
	"net/http"
	"strconv"

	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ReservationHandler struct {
	resSvc *service.ReservationService
}

func NewReservationHandler(resSvc *service.ReservationService) *ReservationHandler {
	return &ReservationHandler{resSvc: resSvc}
}

// Customer endpoints
func (h *ReservationHandler) CreateReservation(c *gin.Context) {
	var req dto.CreateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter a valid quantity (1 or more)."})
		return
	}

	res, err := h.resSvc.CreateReservation(currentUserID(c), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"reservation": res})
}

func (h *ReservationHandler) ListCustomerReservations(c *gin.Context) {
	reservations, err := h.resSvc.ListCustomerReservations(currentUserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reservations": reservations})
}

func (h *ReservationHandler) GetCustomerReservationDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID."})
		return
	}

	res, err := h.resSvc.GetCustomerReservation(currentUserID(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reservation": res})
}

func (h *ReservationHandler) CancelReservation(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID."})
		return
	}

	res, err := h.resSvc.CancelReservation(currentUserID(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"reservation": res,
		"message":     "Reservation cancelled and quantity restored to shop inventory.",
	})
}

// Shop Owner endpoints
func (h *ReservationHandler) GetShopDashboard(c *gin.Context) {
	dash, err := h.resSvc.GetShopDashboard(currentUserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dash)
}

func (h *ReservationHandler) ListShopReservations(c *gin.Context) {
	statusFilter := c.Query("status")
	reservations, err := h.resSvc.ListShopReservations(currentUserID(c), statusFilter)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reservations": reservations})
}

func (h *ReservationHandler) GetShopReservationDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID."})
		return
	}

	res, err := h.resSvc.GetShopReservationDetail(currentUserID(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reservation": res})
}
