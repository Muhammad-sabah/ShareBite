package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

const maxUploadSize = 5 << 20 // 5 MB

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	return &UploadHandler{uploadDir: uploadDir}
}

func (h *UploadHandler) UploadFoodImage(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize+1024)

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please select an image file (max 5 MB)."})
		return
	}
	defer file.Close()

	if header.Size > maxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file size must be 5 MB or less."})
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp":
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG, PNG, and WebP images are supported."})
		return
	}

	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && n == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to read uploaded file."})
		return
	}
	mime := http.DetectContentType(buf[:n])
	if !strings.HasPrefix(mime, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Uploaded file is not a valid image."})
		return
	}

	if _, err := file.Seek(0, 0); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process image upload."})
		return
	}

	if err := os.MkdirAll(h.uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare upload storage."})
		return
	}

	randBytes := make([]byte, 12)
	if _, err := rand.Read(randBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file name."})
		return
	}

	filename := fmt.Sprintf("offer_%s%s", hex.EncodeToString(randBytes), ext)
	destPath := filepath.Join(h.uploadDir, filename)

	if err := c.SaveUploadedFile(header, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded image."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"image_url": "/uploads/" + filename,
	})
}
