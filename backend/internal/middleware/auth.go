package middleware

import (
	"net/http"
	"strings"

	"baqaya-backend/internal/util"
	"github.com/gin-gonic/gin"
)

const (
	ContextUserIDKey   = "user_id"
	ContextUsernameKey = "username"
	ContextRoleKey     = "role"
	ContextShopIDKey   = "shop_id"
)

// AuthRequired validates the Bearer JWT token and injects user claims into Gin context.
func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required. Please log in.",
			})
			return
		}

		tokenStr := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		claims, err := util.ParseToken(tokenStr, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Your session has expired or is invalid. Please log in again.",
			})
			return
		}

		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextUsernameKey, claims.Username)
		c.Set(ContextRoleKey, claims.Role)
		c.Set(ContextShopIDKey, claims.ShopID)
		c.Next()
	}
}

// RequireRole enforces role-based access control (RBAC) for protected endpoints.
func RequireRole(allowedRole string) gin.HandlerFunc {
	return RequireRoles(allowedRole)
}

// RequireRoles enforces that the user's role matches one of the allowed roles.
func RequireRoles(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get(ContextRoleKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "You do not have permission to access this resource.",
			})
			return
		}
		roleStr, _ := roleVal.(string)
		for _, r := range allowedRoles {
			if roleStr == r {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "You do not have permission to access this resource.",
		})
	}
}
