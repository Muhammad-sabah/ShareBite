package handler

import (
	"net/http"

	"baqaya-backend/internal/dto"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

func (h *AuthHandler) RegisterCustomer(c *gin.Context) {
	var req dto.CustomerRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload."})
		return
	}

	res, err := h.authSvc.RegisterCustomer(req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *AuthHandler) RegisterShopOwner(c *gin.Context) {
	var req dto.ShopOwnerRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload."})
		return
	}

	res, err := h.authSvc.RegisterShopOwner(req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload."})
		return
	}

	res, err := h.authSvc.Login(req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) Me(c *gin.Context) {
	profile, err := h.authSvc.GetProfile(currentUserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": profile})
}

func (h *AuthHandler) UpdateShopProfile(c *gin.Context) {
	var req dto.UpdateShopProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload."})
		return
	}

	shop, err := h.authSvc.UpdateShopProfile(currentUserID(c), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"shop": shop})
}

