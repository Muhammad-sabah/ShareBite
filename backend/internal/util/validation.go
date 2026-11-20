package util

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"baqaya-backend/internal/models"
)

var phoneRegex = regexp.MustCompile(`^\d{10,15}$`)

// ValidationError carries a user-friendly validation message and optional field key.
type ValidationError struct {
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

func (e *ValidationError) Error() string {
	return e.Message
}

// NewValidationError creates a ValidationError.
func NewValidationError(field, message string) *ValidationError {
	return &ValidationError{Field: field, Message: message}
}

// ValidateRequired checks that a string is non-empty after trimming.
func ValidateRequired(value, field, label string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", NewValidationError(field, fmt.Sprintf("%s cannot be empty.", label))
	}
	return trimmed, nil
}

// ValidatePersonName ensures a name is non-empty and contains only letters and spaces.
func ValidatePersonName(value, field, label string) (string, error) {
	trimmed, err := ValidateRequired(value, field, label)
	if err != nil {
		return "", err
	}
	hasLetter := false
	for _, r := range trimmed {
		if unicode.IsLetter(r) {
			hasLetter = true
		} else if !unicode.IsSpace(r) {
			return "", NewValidationError(field, fmt.Sprintf("%s must contain letters and spaces only.", label))
		}
	}
	if !hasLetter {
		return "", NewValidationError(field, fmt.Sprintf("%s must contain letters and spaces only.", label))
	}
	return trimmed, nil
}

// ValidatePhone ensures a phone number contains 10 to 15 digits only.
func ValidatePhone(value, field, label string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", NewValidationError(field, fmt.Sprintf("%s cannot be empty.", label))
	}
	if !phoneRegex.MatchString(trimmed) {
		return "", NewValidationError(field, fmt.Sprintf("%s must be digits only (10 to 15 digits).", label))
	}
	return trimmed, nil
}

// ValidateUsername ensures username is non-empty and contains no whitespace.
func ValidateUsername(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", NewValidationError("username", "Username cannot be empty.")
	}
	for _, r := range trimmed {
		if unicode.IsSpace(r) {
			return "", NewValidationError("username", "Username cannot contain spaces.")
		}
	}
	if len(trimmed) > 64 {
		return "", NewValidationError("username", "Username must be 64 characters or fewer.")
	}
	return trimmed, nil
}

// ValidatePassword enforces the approved minimum 6 character rule (FR-AUTH-01/02).
func ValidatePassword(value string) error {
	if len(value) < 6 {
		return NewValidationError("password", "Password must be at least 6 characters long.")
	}
	return nil
}

// ValidateCategory checks that a category is in the approved list.
func ValidateCategory(category string) (string, error) {
	trimmed := strings.TrimSpace(category)
	for _, allowed := range models.AllowedCategories {
		if trimmed == allowed {
			return trimmed, nil
		}
	}
	return "", NewValidationError("category", fmt.Sprintf("Please select a valid category from: %s.", strings.Join(models.AllowedCategories, ", ")))
}

// ParsePickupSchedule validates pickup_date (YYYY-MM-DD), pickup_start_time (HH:MM),
// and pickup_end_time (HH:MM) in the provided timezone location.
func ParsePickupSchedule(dateStr, startStr, endStr string, now time.Time, loc *time.Location) (time.Time, time.Time, error) {
	dStr := strings.TrimSpace(dateStr)
	sStr := strings.TrimSpace(startStr)
	eStr := strings.TrimSpace(endStr)

	pDate, err := time.ParseInLocation("2006-01-02", dStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, NewValidationError("pickup_date", "Pickup date format must be YYYY-MM-DD.")
	}

	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	if pDate.Before(today) {
		return time.Time{}, time.Time{}, NewValidationError("pickup_date", "Pickup date must be today or a future date.")
	}

	startDT, err := time.ParseInLocation("2006-01-02 15:04", dStr+" "+sStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, NewValidationError("pickup_start_time", "Pickup start time format must be HH:MM (24-hour format).")
	}

	endDT, err := time.ParseInLocation("2006-01-02 15:04", dStr+" "+eStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, NewValidationError("pickup_end_time", "Pickup end time format must be HH:MM (24-hour format).")
	}

	if !endDT.After(startDT) {
		return time.Time{}, time.Time{}, NewValidationError("pickup_end_time", "Pickup end time must be strictly after the pickup start time.")
	}

	if pDate.Equal(today) && startDT.Before(now) {
		return time.Time{}, time.Time{}, NewValidationError("pickup_start_time", "Pickup start time cannot be in the past for today's offers.")
	}

	if !endDT.After(now) {
		return time.Time{}, time.Time{}, NewValidationError("pickup_end_time", "Pickup end time must be in the future.")
	}

	return startDT, endDT, nil
}

// CalculateDiscountPercent calculates integer discount percentage.
func CalculateDiscountPercent(originalPrice, discountedPrice uint) int {
	if originalPrice == 0 || discountedPrice >= originalPrice {
		return 0
	}
	diff := float64(originalPrice - discountedPrice)
	return int((diff/float64(originalPrice))*100 + 0.5)
}

