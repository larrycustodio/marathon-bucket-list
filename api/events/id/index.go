// Vercel Go handler for GET /api/events/:id, PATCH /api/events/:id,
// and DELETE /api/events/:id.
//
// vercel.json rewrites /api/events/:id → /api/events/id?id=:id so this
// handler reads the event ID from the "id" query parameter.
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	supabase "github.com/supabase-community/supabase-go"

	"marathon-bucket-list/api/shared"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		jsonError(w, "missing event id", http.StatusBadRequest)
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
		handleGet(w, client, userID, id)
	case http.MethodPatch:
		handleUpdate(w, r, client, userID, id)
	case http.MethodDelete:
		handleDelete(w, client, userID, id)
	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleGet — GET /api/events/:id
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

	var rows []shared.DBRow
	if err := json.Unmarshal(data, &rows); err != nil {
		jsonError(w, "failed to parse db response", http.StatusInternalServerError)
		return
	}
	if len(rows) == 0 {
		jsonError(w, "event not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(shared.FromRow(rows[0]))
}

// handleUpdate — PATCH /api/events/:id
func handleUpdate(w http.ResponseWriter, r *http.Request, client *supabase.Client, userID, id string) {
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

	var input shared.EventInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	data, _, err := client.From("marathon_events").
		Update(shared.ToDBUpdate(input), "representation", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		jsonError(w, fmt.Sprintf("db update failed: %v", err), http.StatusInternalServerError)
		return
	}

	var rows []shared.DBRow
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		jsonError(w, "failed to parse db response after update", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(shared.FromRow(rows[0]))
}

// handleDelete — DELETE /api/events/:id
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
