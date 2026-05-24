// Vercel Go serverless function — handles all /api/events routes.
//
// Dynamic route /api/events/:id is rewritten by vercel.json to
// /api/events?id=:id, so the single Handler function dispatches on
// whether the "id" query param is present.
package handler

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	postgrest "github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"
)

// ─── camelCase API types (match TypeScript MarathonEvent) ────────────────────

type event struct {
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

type eventInput struct {
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

type listResponse struct {
	Data       []event `json:"data"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
	TotalPages int     `json:"totalPages"`
}

// ─── snake_case DB row types (match Supabase marathon_events table) ──────────

type dbRow struct {
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

type dbInsert struct {
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

type dbUpdate struct {
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

// ─── Main handler ─────────────────────────────────────────────────────────────

// Handler is the Vercel Go serverless entry point.
//
// Routes:
//
//	GET    /api/events          → list with search/filter/pagination
//	POST   /api/events          → create
//	GET    /api/events?id=:id   → get one  (rewritten from /api/events/:id)
//	PATCH  /api/events?id=:id   → update   (rewritten from /api/events/:id)
//	DELETE /api/events?id=:id   → delete   (rewritten from /api/events/:id)
func Handler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	client, err := newClient()
	if err != nil {
		jsonError(w, "failed to initialize db client", http.StatusInternalServerError)
		return
	}

	userID := os.Getenv("SUPABASE_USER_ID")
	w.Header().Set("Content-Type", "application/json")

	// vercel.json rewrites /api/events/:id → /api/events?id=:id
	id := r.URL.Query().Get("id")

	if id != "" {
		switch r.Method {
		case http.MethodGet:
			handleGet(w, client, userID, id)
		case http.MethodPatch:
			handleUpdate(w, r, client, userID, id)
		case http.MethodDelete:
			handleDelete(w, client, userID, id)
		default:
			jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	} else {
		switch r.Method {
		case http.MethodGet:
			handleList(w, r, client, userID)
		case http.MethodPost:
			handleCreate(w, r, client, userID)
		default:
			jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// handleList — GET /api/events
// Query params: q, type, status, page, limit
func handleList(w http.ResponseWriter, r *http.Request, client *supabase.Client, userID string) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	eventType := r.URL.Query().Get("type")
	status := r.URL.Query().Get("status")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 1000 {
		limit = 1000
	}

	fb := client.From("marathon_events").
		Select("*", "exact", false).
		Eq("user_id", userID)

	if q != "" {
		escaped := strings.ReplaceAll(q, "%", `\%`)
		fb = fb.Or(fmt.Sprintf(
			"name.ilike.%%%s%%,city.ilike.%%%s%%,state.ilike.%%%s%%,country.ilike.%%%s%%",
			escaped, escaped, escaped, escaped,
		), "")
	}
	if eventType != "" && eventType != "all" {
		fb = fb.Eq("event_type", eventType)
	}
	if status != "" {
		fb = fb.Eq("status", status)
	}

	fb = fb.Order("planned_date", &postgrest.OrderOpts{Ascending: true})
	from := (page - 1) * limit
	fb = fb.Range(from, from+limit-1, "")

	data, total, err := fb.Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db query failed: %v", err), http.StatusInternalServerError)
		return
	}

	var rows []dbRow
	if err := json.Unmarshal(data, &rows); err != nil {
		jsonError(w, "failed to parse db response", http.StatusInternalServerError)
		return
	}

	events := make([]event, len(rows))
	for i, row := range rows {
		events[i] = fromRow(row)
	}

	totalInt := int(total)
	totalPages := int(math.Ceil(float64(totalInt) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	json.NewEncoder(w).Encode(listResponse{
		Data:       events,
		Total:      totalInt,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// handleCreate — POST /api/events
func handleCreate(w http.ResponseWriter, r *http.Request, client *supabase.Client, userID string) {
	var input eventInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Name) == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.PlannedDate) == "" {
		jsonError(w, "plannedDate is required", http.StatusBadRequest)
		return
	}
	if input.EventType == "" {
		jsonError(w, "eventType is required", http.StatusBadRequest)
		return
	}

	row := toDBInsert(input, userID)
	data, _, err := client.From("marathon_events").
		Insert(row, false, "", "representation", "exact").
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db insert failed: %v", err), http.StatusInternalServerError)
		return
	}

	var rows []dbRow
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		jsonError(w, "failed to parse db response after insert", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(fromRow(rows[0]))
}

// handleGet — GET /api/events?id=:id
func handleGet(w http.ResponseWriter, client *supabase.Client, userID, id string) {
	data, _, err := client.From("marathon_events").
		Select("*", "exact", false).
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db query failed: %v", err), http.StatusInternalServerError)
		return
	}
	var rows []dbRow
	if err := json.Unmarshal(data, &rows); err != nil {
		jsonError(w, "failed to parse db response", http.StatusInternalServerError)
		return
	}
	if len(rows) == 0 {
		jsonError(w, "event not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(fromRow(rows[0]))
}

// handleUpdate — PATCH /api/events?id=:id
func handleUpdate(w http.ResponseWriter, r *http.Request, client *supabase.Client, userID, id string) {
	// Verify exists before decoding body
	check, _, err := client.From("marathon_events").
		Select("id", "exact", false).
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db query failed: %v", err), http.StatusInternalServerError)
		return
	}
	var existing []map[string]interface{}
	json.Unmarshal(check, &existing)
	if len(existing) == 0 {
		jsonError(w, "event not found", http.StatusNotFound)
		return
	}

	var input eventInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	update := toDBUpdate(input)
	data, _, err := client.From("marathon_events").
		Update(update, "representation", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db update failed: %v", err), http.StatusInternalServerError)
		return
	}

	var rows []dbRow
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		jsonError(w, "failed to parse db response after update", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(fromRow(rows[0]))
}

// handleDelete — DELETE /api/events?id=:id
func handleDelete(w http.ResponseWriter, client *supabase.Client, userID, id string) {
	check, _, err := client.From("marathon_events").
		Select("id", "exact", false).
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db query failed: %v", err), http.StatusInternalServerError)
		return
	}
	var existing []map[string]interface{}
	json.Unmarshal(check, &existing)
	if len(existing) == 0 {
		jsonError(w, "event not found", http.StatusNotFound)
		return
	}

	_, _, err = client.From("marathon_events").
		Delete("", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db delete failed: %v", err), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

func fromRow(row dbRow) event {
	return event{
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

func toDBInsert(input eventInput, userID string) dbInsert {
	return dbInsert{
		ID:                 generateID(),
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

func toDBUpdate(input eventInput) dbUpdate {
	return dbUpdate{
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

// generateID creates a unique event ID: "<unix_ms>-<7 random chars>"
// Matches the format used by the old IndexedDB layer.
func generateID() string {
	b := make([]byte, 7)
	for i := range b {
		b[i] = idChars[rand.Intn(len(idChars))]
	}
	return fmt.Sprintf("%d-%s", time.Now().UnixMilli(), string(b))
}

func newClient() (*supabase.Client, error) {
	return supabase.NewClient(
		os.Getenv("SUPABASE_URL"),
		os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		nil,
	)
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
