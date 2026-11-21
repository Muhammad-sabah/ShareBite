package service

import "errors"

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
)

// AppError represents a structured business-rule or validation failure safe to show users.
type AppError struct {
	Code    int
	Field   string
	Message string
}

func (e *AppError) Error() string {
	return e.Message
}
