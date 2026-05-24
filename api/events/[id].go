// Handler for GET /api/events/:id, PATCH /api/events/:id, DELETE /api/events/:id
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	supabase "github.com/supabase-community/supabase-go"

	shared "marathon-bucket-list/api/shared"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Extract :id from the URL path: /api/events/<id>
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	id := parts[len(parts)-1]
	if id == "" {
		jsonError(w, "missing event id", http.StatusBadRequest)
		return
	}

	client, err := newClient()
	if err != nil {
		jsonError(w, "failed to initialize db client", http.StatusInternalServerError)
		return
	}

	userID := os.Getenv("NEXT_PUBLIC_SUPABASE_USER_ID")

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

// handleGet handles GET /api/events/:id
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

// handleUpdate handles PATCH /api/events/:id
func handleUpdate(w http.ResponseWriter, r *http.Request, client *supabase.Client, userID, id string) {
	// Verify the event exists and belongs to the user
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

	update := shared.ToDBUpdate(input)

	data, _, err := client.From("marathon_events").
		Update(update, "representation", "exact").
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

// handleDelete handles DELETE /api/events/:id
func handleDelete(w http.ResponseWriter, client *supabase.Client, userID, id string) {
	// Verify the event exists before deleting
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

// ─── Helpers (duplicated from index.go — each Vercel handler compiles independently) ───

func newClient() (*supabase.Client, error) {
	url := os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	key := os.Getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
	return supabase.NewClient(url, key, nil)
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
