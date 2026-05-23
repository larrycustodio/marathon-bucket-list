import type { MarathonEvent } from "../types";
import { timeUntil } from "../utils/timeUntil";
import EventBadge from "./EventBadge";
import SummaryWidget from "./SummaryWidget";

interface Props {
  events: MarathonEvent[];
  finished: MarathonEvent[];
  planned: MarathonEvent[];
}

const CARD =
  "bg-white rounded-[4px] shadow-[0_8px_24px_rgba(13,13,18,0.04)] mb-3 relative p-5";

function countryFlag(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("united states") || c === "usa" || c === "us") return "🇺🇸";
  if (c.includes("canada")) return "🇨🇦";
  if (c.includes("united kingdom") || c.includes("uk") || c.includes("england"))
    return "🇬🇧";
  if (c.includes("japan")) return "🇯🇵";
  if (c.includes("germany")) return "🇩🇪";
  if (c.includes("france")) return "🇫🇷";
  if (c.includes("australia")) return "🇦🇺";
  if (c.includes("mexico")) return "🇲🇽";
  if (c.includes("ireland")) return "🇮🇪";
  if (c.includes("korea")) return "🇰🇷";
  return "🌍";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SummaryPanel({ events, finished, planned }: Props) {
  // Finished: group by country
  const byCountry = finished.reduce<Record<string, number>>((acc, e) => {
    const key = e.country || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const countrySorted = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);

  // Planned: next upcoming event
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [...planned]
    .filter((e) => new Date(e.plannedDate) >= today)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  const nextEvent = upcoming[0] ?? null;

  // States covered
  const statesCovered = new Set(events.map((e) => e.state)).size;

  return (
    <div>
      {/* Total */}
      <div className={CARD}>
        <div className="text-4xl font-bold text-slate-900 tracking-tight">
          {events.length}
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-medium">
          Total Races
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {statesCovered} US state{statesCovered !== 1 ? "s" : ""}
          </span>
          <span>
            {new Set(events.map((e) => e.country)).size} countr
            {new Set(events.map((e) => e.country)).size !== 1 ? "ies" : "y"}
          </span>
        </div>
      </div>

      {/* Finished */}
      <div className={CARD}>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-3xl font-bold text-slate-900">
              {finished.length}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-widest mt-0.5 font-medium">
              Finished
            </div>
          </div>
          <span className="text-2xl">🏅</span>
        </div>

        {finished.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No finished races yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {countrySorted.map(([country, count]) => (
              <li key={country} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-slate-700">
                  <span>{countryFlag(country)}</span>
                  <span className="truncate max-w-[130px]">{country}</span>
                </span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Planned */}
      <div className={CARD}>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-3xl font-bold text-slate-900">
              {planned.length}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-widest mt-0.5 font-medium">
              Planned
            </div>
          </div>
          <span className="text-2xl">📋</span>
        </div>

        {nextEvent ? (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">
              Next up
            </div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-slate-900 text-sm leading-snug">
                {nextEvent.name}
              </div>
              <EventBadge event={nextEvent} />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {nextEvent.state && nextEvent.state !== "—"
                ? `${nextEvent.city}, ${nextEvent.state}`
                : `${nextEvent.city}, ${nextEvent.country}`}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">
                {formatDate(nextEvent.plannedDate)}
              </span>
              {(() => {
                const t = timeUntil(nextEvent.plannedDate);
                return (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${t.bgClass} ${t.textColorClass}`}
                  >
                    {t.text}
                  </span>
                );
              })()}
            </div>
          </div>
        ) : planned.length > 0 ? (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 italic">
            All planned races are in the past.
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No planned races yet.</p>
        )}
      </div>

      <div className={CARD}>
        <div className="text-xs text-slate-400 uppercase tracking-widest mt-0.5 font-medium">
          What to Tell Everyone
        </div>
        <SummaryWidget events={events} finished={finished} planned={planned} />
      </div>
    </div>
  );
}
