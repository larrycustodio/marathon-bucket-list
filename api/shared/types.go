// Package shared provides types and helpers shared across Vercel Go API handlers.
package shared

import (
	"fmt"
	"math/rand"
	"time"
)

// ─── camelCase API types (match TypeScript MarathonEvent) ────────────────────

// Event is the camelCase representation returned to/accepted from the frontend.
type Event struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	EventType          string   `json:"eventType"`
	CustomDistance     *float64 `json:"customDistance,omitempty"`
	CustomDistanceUnit *string  `json:"customDistanceUnit,omitempty"`
	PlannedDate        string   `json:"plannedDate"`
	FinishedDate       *string  `json:"finishedDate,omitempty"`
	FinishedTime       *string  `json:"finishedTime,omitempty"`
	GoalFinishTime     *string  `json:"goalFinishTime,omitempty"`
	City               *string  `json:"city,omitempty"`
	State              string   `json:"state"`
	Country            string   `json:"country"`
	Website            *string  `json:"website,omitempty"`
	StravaURL          *string  `json:"stravaUrl,omitempty"`
	Status             string   `json:"status"`
	CreatedAt          string   `json:"createdAt"`
	UpdatedAt          string   `json:"updatedAt"`
}

// EventInput mirrors the TypeScript MarathonEventInput (no managed fields).
type EventInput struct {
	Name               string   `json:"name"`
	EventType          string   `json:"eventType"`
	CustomDistance     *float64 `json:"customDistance,omitempty"`
	CustomDistanceUnit *string  `json:"customDistanceUnit,omitempty"`
	PlannedDate        string   `json:"plannedDate"`
	FinishedDate       *string  `json:"finishedDate,omitempty"`
	FinishedTime       *string  `json:"finishedTime,omitempty"`
	GoalFinishTime     *string  `json:"goalFinishTime,omitempty"`
	City               *string  `json:"city,omitempty"`
	State              string   `json:"state"`
	Country            string   `json:"country"`
	Website            *string  `json:"website,omitempty"`
	StravaURL          *string  `json:"stravaUrl,omitempty"`
}

// ListResponse is the envelope returned by GET /api/events.
type ListResponse struct {
	Data       []Event `json:"data"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
	TotalPages int     `json:"totalPages"`
}

// ─── snake_case DB row (matches Supabase marathon_events table) ──────────────

// DBRow is the full persisted row as returned by Supabase (snake_case).
type DBRow struct {
	ID                 string   `json:"id"`
	UserID             string   `json:"user_id"`
	EventType          string   `json:"event_type"`
	CustomDistance     *float64 `json:"custom_distance,omitempty"`
	CustomDistanceUnit *string  `json:"custom_distance_unit,omitempty"`
	PlannedDate        string   `json:"planned_date"`
	FinishedDate       *string  `json:"finished_date,omitempty"`
	FinishedTime       *string  `json:"finished_time,omitempty"`
	GoalFinishTime     *string  `json:"goal_finish_time,omitempty"`
	Name               string   `json:"name"`
	City               *string  `json:"city,omitempty"`
	State              string   `json:"state"`
	Country            string   `json:"country"`
	Website            *string  `json:"website,omitempty"`
	StravaURL          *string  `json:"strava_url,omitempty"`
	Status             string   `json:"status"`
	CreatedAt          string   `json:"created_at"`
	UpdatedAt          string   `json:"updated_at"`
}

// DBInsert is the snake_case payload for INSERT (no status/created_at/updated_at —
// those are managed by the DB).
type DBInsert struct {
	ID                 string   `json:"id"`
	UserID             string   `json:"user_id"`
	EventType          string   `json:"event_type"`
	CustomDistance     *float64 `json:"custom_distance,omitempty"`
	CustomDistanceUnit *string  `json:"custom_distance_unit,omitempty"`
	PlannedDate        string   `json:"planned_date"`
	FinishedDate       *string  `json:"finished_date,omitempty"`
	FinishedTime       *string  `json:"finished_time,omitempty"`
	GoalFinishTime     *string  `json:"goal_finish_time,omitempty"`
	Name               string   `json:"name"`
	City               *string  `json:"city,omitempty"`
	State              string   `json:"state"`
	Country            string   `json:"country"`
	Website            *string  `json:"website,omitempty"`
	StravaURL          *string  `json:"strava_url,omitempty"`
}

// DBUpdate is the snake_case payload for UPDATE (same as DBInsert minus id/user_id).
type DBUpdate struct {
	EventType          string   `json:"event_type"`
	CustomDistance     *float64 `json:"custom_distance,omitempty"`
	CustomDistanceUnit *string  `json:"custom_distance_unit,omitempty"`
	PlannedDate        string   `json:"planned_date"`
	FinishedDate       *string  `json:"finished_date,omitempty"`
	FinishedTime       *string  `json:"finished_time,omitempty"`
	GoalFinishTime     *string  `json:"goal_finish_time,omitempty"`
	Name               string   `json:"name"`
	City               *string  `json:"city,omitempty"`
	State              string   `json:"state"`
	Country            string   `json:"country"`
	Website            *string  `json:"website,omitempty"`
	StravaURL          *string  `json:"strava_url,omitempty"`
}

// ─── Conversion helpers ──────────────────────────────────────────────────────

// FromRow converts a snake_case DBRow into the camelCase Event type.
func FromRow(row DBRow) Event {
	return Event{
		ID:                 row.ID,
		Name:               row.Name,
		EventType:          row.EventType,
		CustomDistance:     row.CustomDistance,
		CustomDistanceUnit: row.CustomDistanceUnit,
		PlannedDate:        row.PlannedDate,
		FinishedDate:       row.FinishedDate,
		FinishedTime:       row.FinishedTime,
		GoalFinishTime:     row.GoalFinishTime,
		City:               row.City,
		State:              row.State,
		Country:            row.Country,
		Website:            row.Website,
		StravaURL:          row.StravaURL,
		Status:             row.Status,
		CreatedAt:          row.CreatedAt,
		UpdatedAt:          row.UpdatedAt,
	}
}

// ToDBInsert converts a camelCase EventInput into the snake_case DBInsert payload.
// It assigns a new ID and pins the row to the given userID.
func ToDBInsert(input EventInput, userID string) DBInsert {
	return DBInsert{
		ID:                 GenerateID(),
		UserID:             userID,
		EventType:          input.EventType,
		CustomDistance:     input.CustomDistance,
		CustomDistanceUnit: input.CustomDistanceUnit,
		PlannedDate:        input.PlannedDate,
		FinishedDate:       input.FinishedDate,
		FinishedTime:       input.FinishedTime,
		GoalFinishTime:     input.GoalFinishTime,
		Name:               input.Name,
		City:               input.City,
		State:              input.State,
		Country:            input.Country,
		Website:            input.Website,
		StravaURL:          input.StravaURL,
	}
}

// ToDBUpdate converts a camelCase EventInput into the snake_case DBUpdate payload.
func ToDBUpdate(input EventInput) DBUpdate {
	return DBUpdate{
		EventType:          input.EventType,
		CustomDistance:     input.CustomDistance,
		CustomDistanceUnit: input.CustomDistanceUnit,
		PlannedDate:        input.PlannedDate,
		FinishedDate:       input.FinishedDate,
		FinishedTime:       input.FinishedTime,
		GoalFinishTime:     input.GoalFinishTime,
		Name:               input.Name,
		City:               input.City,
		State:              input.State,
		Country:            input.Country,
		Website:            input.Website,
		StravaURL:          input.StravaURL,
	}
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const idChars = "abcdefghijklmnopqrstuvwxyz0123456789"

// GenerateID creates a unique event ID matching the IndexedDB convention:
// "<unix_ms>-<7 random alphanum chars>"
func GenerateID() string {
	b := make([]byte, 7)
	for i := range b {
		b[i] = idChars[rand.Intn(len(idChars))]
	}
	return fmt.Sprintf("%d-%s", time.Now().UnixMilli(), string(b))
}
