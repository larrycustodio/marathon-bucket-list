// Package shared provides types and conversion helpers shared across
// Vercel Go API handlers. This package has no Handler function and is
// therefore not treated as a route by Vercel's routing system.
package shared

import (
	"fmt"
	"math/rand"
	"time"
)

// ─── camelCase API types (match TypeScript MarathonEvent) ────────────────────

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

type ListResponse struct {
	Data       []Event `json:"data"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
	TotalPages int     `json:"totalPages"`
}

// ─── snake_case DB types (match Supabase marathon_events columns) ─────────────

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

// DBInsert is the payload for INSERT (id + user_id required; status/timestamps managed by DB).
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

// DBUpdate is the payload for UPDATE (no id/user_id; updated_at refreshed by DB trigger).
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

// ─── Conversion helpers ───────────────────────────────────────────────────────

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

// ─── Utilities ────────────────────────────────────────────────────────────────

const idChars = "abcdefghijklmnopqrstuvwxyz0123456789"

// GenerateID produces a unique event ID matching the old IndexedDB format:
// "<unix_ms>-<7 random alphanum chars>"
func GenerateID() string {
	b := make([]byte, 7)
	for i := range b {
		b[i] = idChars[rand.Intn(len(idChars))]
	}
	return fmt.Sprintf("%d-%s", time.Now().UnixMilli(), string(b))
}
