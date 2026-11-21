package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateBucket struct {
	tokens     float64
	lastRefill time.Time
}

// RateLimiter provides simple per-IP token-bucket rate limiting for sensitive endpoints.
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*rateBucket
	capacity float64
	refillPS float64
}

func NewRateLimiter(requestsPerMinute int) *RateLimiter {
	capVal := float64(requestsPerMinute)
	if capVal < 5 {
		capVal = 5
	}
	return &RateLimiter{
		buckets:  make(map[string]*rateBucket),
		capacity: capVal,
		refillPS: capVal / 60.0,
	}
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		rl.mu.Lock()
		b, exists := rl.buckets[ip]
		if !exists {
			b = &rateBucket{tokens: rl.capacity, lastRefill: now}
			rl.buckets[ip] = b
		} else {
			elapsed := now.Sub(b.lastRefill).Seconds()
			b.tokens += elapsed * rl.refillPS
			if b.tokens > rl.capacity {
				b.tokens = rl.capacity
			}
			b.lastRefill = now
		}

		if b.tokens < 1.0 {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please wait a moment and try again.",
			})
			return
		}
		b.tokens -= 1.0
		rl.mu.Unlock()

		c.Next()
	}
}
