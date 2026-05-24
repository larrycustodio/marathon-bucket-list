// Vercel Go handler for GET /api/events and POST /api/events.
package handler

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"

	postgrest "github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"

	"marathon-bucket-list/api/shared"
)

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

	switch r.Method {
	case http.MethodGet:
		handleList(w, r, client, userID)
	case http.MethodPost:
		handleCreate(w, r, client, userID)
	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleList — GET /api/events
// Params: q (search), type, status, page (1-based), limit (default 1000)
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

	var rows []shared.DBRow
	if err := json.Unmarshal(data, &rows); err != nil {
		jsonError(w, "failed to parse db response", http.StatusInternalServerError)
		return
	}

	events := make([]shared.Event, len(rows))
	for i, row := range rows {
		events[i] = shared.FromRow(row)
	}

	totalInt := int(total)
	totalPages := int(math.Ceil(float64(totalInt) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	json.NewEncoder(w).Encode(shared.ListResponse{
		Data:       events,
		Total:      totalInt,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// handleCreate — POST /api/events
func handleCreate(w http.ResponseWriter, r *http.Request, client *supabase.Client, userID string) {
	var input shared.EventInput
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

	row := shared.ToDBInsert(input, userID)
	data, _, err := client.From("marathon_events").
		Insert(row, false, "", "representation", "exact").
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db insert failed: %v", err), http.StatusInternalServerError)
		return
	}

	var rows []shared.DBRow
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		jsonError(w, "failed to parse db response after insert", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(shared.FromRow(rows[0]))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
