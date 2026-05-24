# Marathon Bucket List — Architecture

## Project Overview

A personal race-tracking app for logging and planning half-marathons, full marathons, and custom-distance running events. Single-user, no auth in the current build. Data lives in browser IndexedDB.

**Goal:** Migrate the storage layer from IndexedDB to Supabase (Postgres) while keeping the React front-end and all business logic unchanged.

---

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | TanStack Router v1 |
| Server state | TanStack Query v5 |
| Maps | @visx/geo (AlbersUsa + Mercator) |
| Storage (current) | Browser IndexedDB via native API |
| Storage (target) | Supabase (Postgres + JS client) |

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

## Current Storage Layer — `src/db/index.ts`

The DB module exposes 5 functions that are the **only** interface the rest of the app uses. Replacing these with Supabase calls requires no changes outside this file.

```typescript
// Read all events for the current user
getEvents(): Promise<MarathonEvent[]>

// Read a single event by id
getEvent(id: string): Promise<MarathonEvent | undefined>

// Create a new event; assigns id, status, createdAt, updatedAt
createEvent(input: MarathonEventInput): Promise<MarathonEvent>

// Update an event by id; re-derives status, updates updatedAt
updateEvent(id: string, updates: Partial<MarathonEventInput>): Promise<MarathonEvent>

// Hard delete
deleteEvent(id: string): Promise<void>
```

The hooks layer (`src/hooks/useEvents.ts`) wraps these in TanStack Query and handles cache invalidation. **The hooks do not need to change** — only the implementations inside `src/db/index.ts`.

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

## Migration Plan for `src/db/index.ts`

Replace the entire file with Supabase client calls. The public interface stays identical.

```typescript
import { createClient } from '@supabase/supabase-js';
import type { MarathonEvent, MarathonEventInput } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// snake_case DB row → camelCase MarathonEvent
function fromRow(row: Record<string, unknown>): MarathonEvent { ... }

// camelCase input → snake_case insert payload
function toRow(input: MarathonEventInput): Record<string, unknown> { ... }
```

**Required env vars (`.env.local`):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Auth considerations

The current app has no login screen. For the Supabase backend, decide:

- **Single user (simplest):** Hardcode a single Supabase user. App auto-signs in on load with `supabase.auth.signInWithPassword`. No login UI needed.
- **Multi-user:** Add an auth page. The `user_id` RLS policy handles data isolation automatically.

---

## Key Files Reference

```
src/
  types/index.ts          — MarathonEvent, MarathonEventInput, enums
  db/index.ts             — Storage layer (ONLY file to replace for Supabase)
  hooks/useEvents.ts      — TanStack Query hooks (no changes needed)
  components/
    EventForm.tsx         — Create/edit form; sends MarathonEventInput
    EventTable.tsx        — Paginated table with search + filter
    Dashboard.tsx         — Root layout, splits events into finished/planned
    SummaryPanel.tsx      — Left sidebar stats
    SummaryWidget.tsx     — Conversational summary sentence (pure fn: buildSummary)
    USAMap.tsx            — Choropleth map, colors states by finished/planned
    WorldMap.tsx          — World map, hover tooltips grouped by continent
    MapView.tsx           — Tab wrapper for USA/World maps
    MarathonTimeInput.tsx — Masked H:MM:SS time input
```
