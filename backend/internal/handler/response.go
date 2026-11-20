package handler

import (
	"errors"
	"log"
	"net/http"

	"baqaya-backend/internal/middleware"
	"baqaya-backend/internal/service"
	"github.com/gin-gonic/gin"
)

func respondError(c *gin.Context, err error) {
	var appErr *service.AppError
	if errors.As(err, &appErr) {
		payload := gin.H{"error": appErr.Message}
		if appErr.Field != "" {
			payload["field"] = appErr.Field
		}
		c.JSON(appErr.Code, payload)
		return
	}

	switch {
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Requested resource was not found."})
	case errors.Is(err, service.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to perform this action."})
	case errors.Is(err, service.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required."})
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "Operation conflicts with current state."})
	default:
		// Log actual error internally; return generic safe error to client
		log.Printf("[ERROR] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An unexpected error occurred. Please try again."})
	}
}

func currentUserID(c *gin.Context) uint64 {
	val, ok := c.Get(middleware.ContextUserIDKey)
	if !ok {
		return 0
	}
	id, _ := val.(uint64)
	return id
}

