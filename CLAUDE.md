# Marathon Bucket List — Architecture

## Project Overview

A personal race-tracking app for logging and planning half-marathons, full marathons, and custom-distance running events. Data is stored in Supabase (Postgres), served via Vercel Go serverless functions, and protected by Google OAuth via Supabase Auth.

---

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | TanStack Router v1 (with auth context + `beforeLoad` guards) |
| Server state | TanStack Query v5 |
| Maps | @visx/geo (AlbersUsa + Mercator) |
| Auth | Supabase Auth — Google OAuth (`@supabase/supabase-js`) |
| Storage | Supabase Postgres via Vercel Go serverless functions |

---

## Data Model

### Enums / Literals

```typescript
type EventType    = 'half' | 'full' | 'other';
type DistanceUnit = 'mi' | 'km';
type EventStatus  = 'planned' | 'finished';
```

### `MarathonEvent` — full persisted record

```typescript
interface MarathonEvent {
  // identity
  id:          string;       // client-generated: `${Date.now()}-${randomAlpha}`

  // classification
  eventType:   EventType;    // 'half' | 'full' | 'other'

  // custom distance — only set when eventType === 'other'
  customDistance?:     number;        // decimal, 2 sig figs (e.g. 12.5)
  customDistanceUnit?: DistanceUnit;  // 'mi' | 'km'

  // dates
  plannedDate:   string;   // ISO 8601 date: "YYYY-MM-DD" — always required
  finishedDate?: string;   // ISO 8601 date — set = planned date when race is past/today

  // times — stored as "H:MM:SS" strings (e.g. "3:45:22")
  finishedTime?:  string;
  goalFinishTime?: string;

  // location
  name:    string;
  city?:    string;
  state:   string;   // US state abbreviation (e.g. "CA") or "—" for international events
  country: string;   // full country name (e.g. "United States")

  // links
  website?:   string;   // race website URL
  stravaUrl?: string;   // Strava activity URL

  // derived / managed by storage layer
  status:    EventStatus;   // derived: 'finished' if finishedDate is set, else 'planned'
  createdAt: string;        // ISO 8601 datetime
  updatedAt: string;        // ISO 8601 datetime
}
```

### `MarathonEventInput` — write payload (no managed fields)

Identical to `MarathonEvent` minus `id`, `status`, `createdAt`, `updatedAt`. All optional fields remain optional.

---

## Business Logic Rules

These rules live in the storage layer and must be preserved in any backend:

1. **`status` is always derived** — never set by the client directly.
   - `status = 'finished'` if `finishedDate` is present and non-null.
   - `status = 'planned'` otherwise.

2. **`finishedDate` = `plannedDate`** — the UI auto-sets `finishedDate` to the same value as `plannedDate` when the race date is today or in the past. The client never sends a separate finished date.

3. **International events use `state = '—'`** — when an event is outside the US, `state` is stored as the string `"—"` (em-dash). Display logic checks `state === '—'` to format location as `"City, Country"` instead of `"City, State"`.

4. **Time format is `H:MM:SS`** — not seconds, not a duration type. Stored and displayed as-is (e.g. `"3:45:22"`, `"1:05:09"`). No normalization or parsing beyond display.

5. **`customDistance` precision** — stored to 2 decimal places (e.g. `12.5`, `26.22`). Only meaningful when `eventType === 'other'`.

---

## Storage + API Layer — `src/db/index.ts`

The DB module exposes 5 functions that are the **only** interface the rest of the app uses. They call the Vercel Go API under `/api/events` and inject the Supabase session token automatically.

```typescript
// Read all events for the current user (RLS-scoped)
getEvents(): Promise<MarathonEvent[]>

// Read a single event by id
getEvent(id: string): Promise<MarathonEvent | undefined>

// Create a new event; server assigns id, status, createdAt, updatedAt
createEvent(input: MarathonEventInput): Promise<MarathonEvent>

// Update an event by id; server re-derives status and updates updatedAt
updateEvent(id: string, updates: Partial<MarathonEventInput>): Promise<MarathonEvent>

// Hard delete
deleteEvent(id: string): Promise<void>
```

Each call goes through `apiFetch`, which reads `supabase.auth.getSession()` and attaches `Authorization: Bearer <access_token>`. The Go backend validates the token via PostgREST and RLS handles data isolation automatically.

The hooks layer (`src/hooks/useEvents.ts`) wraps these in TanStack Query and handles cache invalidation. **The hooks do not need to change.**

---

## Target: Supabase Schema

### `marathon_events` table

```sql
create table public.marathon_events (
  -- identity
  id            text        primary key,            -- client-generated id
  user_id       uuid        not null references auth.users(id) on delete cascade,

  -- classification
  event_type    text        not null check (event_type in ('half', 'full', 'other')),

  -- custom distance (only when event_type = 'other')
  custom_distance       numeric(6, 2),
  custom_distance_unit  text check (custom_distance_unit in ('mi', 'km')),

  -- dates
  planned_date   date        not null,
  finished_date  date,

  -- times stored as text "H:MM:SS"
  finished_time   text,
  goal_finish_time text,

  -- event info
  name     text not null,
  city     text,
  state    text not null,            -- "—" for international
  country  text not null,
  website  text,
  strava_url text,

  -- derived + managed by DB / API layer
  status      text not null generated always as (
    case when finished_date is not null then 'finished' else 'planned' end
  ) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for common query patterns
create index on public.marathon_events (user_id);
create index on public.marathon_events (user_id, status);
create index on public.marathon_events (user_id, event_type);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.marathon_events
  for each row execute function update_updated_at();
```

### Row-Level Security

```sql
alter table public.marathon_events enable row level security;

-- Users can only see and modify their own events
create policy "owner access"
  on public.marathon_events
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Field Name Mapping (camelCase ↔ snake_case)

| TypeScript field | Postgres column |
|---|---|
| `id` | `id` |
| `eventType` | `event_type` |
| `customDistance` | `custom_distance` |
| `customDistanceUnit` | `custom_distance_unit` |
| `plannedDate` | `planned_date` |
| `finishedDate` | `finished_date` |
| `finishedTime` | `finished_time` |
| `goalFinishTime` | `goal_finish_time` |
| `name` | `name` |
| `city` | `city` |
| `state` | `state` |
| `country` | `country` |
| `website` | `website` |
| `stravaUrl` | `strava_url` |
| `status` | `status` (generated) |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

---

---

## Key Files Reference

```
src/
  lib/
    supabase.ts           — Supabase JS client singleton (anon key, browser-safe)
  context/
    AuthContext.tsx        — AuthProvider + useAuth() hook (session, user, loading, signOut)
  components/
    LoginPage.tsx         — Google OAuth sign-in page
    EventForm.tsx         — Create/edit form; sends MarathonEventInput
    EventTable.tsx        — Paginated table with search + filter
    Dashboard.tsx         — Root layout, splits events into finished/planned
    SummaryPanel.tsx      — Left sidebar stats
    SummaryWidget.tsx     — Conversational summary sentence (pure fn: buildSummary)
    USAMap.tsx            — Choropleth map, colors states by finished/planned
    WorldMap.tsx          — World map, hover tooltips grouped by continent
    MapView.tsx           — Tab wrapper for USA/World maps
    MarathonTimeInput.tsx — Masked H:MM:SS time input
  types/index.ts          — MarathonEvent, MarathonEventInput, enums
  db/index.ts             — REST API client; injects Bearer token from Supabase session
  hooks/useEvents.ts      — TanStack Query hooks (unchanged)
  router.ts               — Routes: /login (public), / (protected); auth context guards
  main.tsx                — AuthProvider wrapper; passes live session to RouterProvider

api/
  shared/
    types.go              — Shared Go types + auth helpers:
                            ExtractToken, ExtractUserID, NewClientWithToken,
                            NewServiceClient, FromRow/ToDBInsert/ToDBUpdate, GenerateID
  events/
    index.go              — GET /api/events (list + filters), POST /api/events (create)
    id/
      index.go            — GET /api/events/:id, PATCH /api/events/:id,
                            DELETE /api/events/:id
                            (routed via vercel.json rewrite — see Dynamic routing below)

go.mod                    — module marathon-bucket-list; supabase-go v0.0.4
swagger.yaml              — OpenAPI 3.0 spec for all five endpoints
vercel.json               — SPA fallback + dynamic route rewrite for Go
```

---

## Backend — Vercel Go + Supabase

### Runtime

Go 1.21+, `github.com/supabase-community/supabase-go` v0.0.4 (wraps PostgREST).

### Auth flow

Every Go handler calls `resolveClient(w, r)` which:

1. **JWT mode (production):** Reads `Authorization: Bearer <token>` from the request,
   base64-decodes the JWT payload to extract the `sub` claim (user UUID), then creates
   a Supabase client with `SUPABASE_ANON_KEY` + the user JWT as the Authorization header.
   PostgREST validates the signature and sets `auth.uid()` so RLS (`auth.uid() = user_id`)
   enforces data isolation automatically — no explicit `user_id` filters needed in queries.

2. **Dev fallback (local only):** If no Authorization header is present **and**
   `SUPABASE_USER_ID` is set in the environment, uses the service-role client with an
   explicit `Eq("user_id", ...)` filter. Allows `curl`/Postman testing without a real
   session token. **Must not be set in Vercel production env vars.**

### Required env vars

Set in `.env.local` (gitignored) for local dev, and in Vercel project settings for production:

| Variable | Where | Description |
|---|---|---|
| `SUPABASE_URL` | Server + client | Base project URL, e.g. `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Server | Anon/public key — used with user JWTs (PostgREST enforces RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service-role key — dev fallback only; bypasses RLS |
| `SUPABASE_USER_ID` | Server (dev only) | UUID of a test user; enables unauthenticated curl testing |
| `VITE_SUPABASE_URL` | Client | Same URL — bundled into the frontend by Vite |
| `VITE_SUPABASE_ANON_KEY` | Client | Same anon key — bundled into the frontend by Vite |

> **Note:** `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` hold the same value.
> The duplicate is required because Vite only exposes `VITE_`-prefixed vars to the browser bundle.

### Dynamic routing — Go + Vercel constraint

Vercel's idiomatic dynamic route convention is a folder named `[id]` containing
`index.go`. **This does not work with Go** because Go's module system forbids
`[` in import paths (`malformed import path: invalid char '['`). The same
restriction also rules out `[id].go` as a filename.

**Workaround:** use a plain `id/` directory and add a `vercel.json` rewrite:

```json
{ "source": "/api/events/:id", "destination": "/api/events/id?id=:id" }
```

The handler at `api/events/id/index.go` reads the event ID from
`r.URL.Query().Get("id")`. The REST URLs seen by the frontend are unchanged
(`/api/events/123`); only the internal routing differs.

### Local development

```bash
# 1. Fill in .env.local with all variables above, then:
vercel dev        # runs the Vite frontend + Go functions on one port (default :3000)

# 2. Open http://localhost:3000 → redirected to /login → "Sign in with Google"
#    After OAuth, Supabase persists the session to localStorage.
#    Subsequent vercel dev sessions auto-restore it (no re-login needed for weeks).

# 3. To test the API directly (dev fallback — requires SUPABASE_USER_ID in .env.local):
curl http://localhost:3000/api/events           # list events
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Boston Marathon","eventType":"full","plannedDate":"2025-04-21","state":"MA","country":"United States"}'
```

### Frontend auth flow

- `src/lib/supabase.ts` — Supabase JS client singleton (anon key, browser-safe)
- `src/context/AuthContext.tsx` — `AuthProvider` hydrates session from localStorage on mount;
  subscribes to `onAuthStateChange` for live updates (token refresh, sign-out)
- `src/router.ts` — uses `createRootRouteWithContext<RouterContext>()`;
  `/` route has a `beforeLoad` guard that redirects to `/login` when `!loading && !session`;
  `/login` route redirects away when already authenticated
- `src/main.tsx` — `<AuthProvider>` wraps the app; `<App>` reads `useAuth()` and passes
  live `{ session, loading }` to `<RouterProvider context={...}>` so guards have fresh state
