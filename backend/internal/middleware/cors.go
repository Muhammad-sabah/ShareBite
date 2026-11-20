package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS configures strict origin-based Cross-Origin Resource Sharing headers.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowedSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowedSet[o] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowedSet[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

