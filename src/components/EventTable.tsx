import { useMemo } from 'react';
import type { MarathonEvent, EventStatus } from '../types';
import type { EventTypeFilter } from '../router';
import { useDeleteEvent } from '../hooks/useEvents';
import { timeUntil } from '../utils/timeUntil';
import StravaIcon from './StravaIcon';

interface Props {
  events: MarathonEvent[];
  title: string;
  status: EventStatus;
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: EventTypeFilter;
  onTypeFilterChange: (v: EventTypeFilter) => void;
  onEdit: (event: MarathonEvent) => void;
}

function formatEventType(event: MarathonEvent): string {
  if (event.eventType === 'other') {
    return event.customDistance != null
      ? `${event.customDistance} ${event.customDistanceUnit ?? 'mi'}`
      : 'Other';
  }
  return event.eventType === 'full' ? 'Full' : 'Half';
}

function typeBadgeClass(event: MarathonEvent): string {
  if (event.eventType === 'full') return 'bg-purple-100 text-purple-700';
  if (event.eventType === 'half') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

function formatTime(t?: string) {
  return t ?? '—';
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLocation(event: MarathonEvent) {
  if (event.state === '—' || !event.state) {
    return `${event.city}, ${event.country}`;
  }
  return `${event.city}, ${event.state}`;
}

export default function EventTable({
  events, title, status,
  search, onSearchChange,
  typeFilter, onTypeFilterChange,
  onEdit,
}: Props) {
  const deleteEvent = useDeleteEvent();

  const filtered = useMemo(() => {
    return events.filter(e => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.state.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || e.eventType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [events, search, typeFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = status === 'finished' ? (a.finishedDate ?? a.plannedDate) : a.plannedDate;
      const dateB = status === 'finished' ? (b.finishedDate ?? b.plannedDate) : b.plannedDate;
      return dateA.localeCompare(dateB);
    });
  }, [filtered, status]);

  return (
    <div className="bg-white rounded-[4px] shadow-[0_8px_24px_rgba(13,13,18,0.04)] mb-3 relative p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search name, state, country..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value as EventTypeFilter)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All types</option>
            <option value="half">Half</option>
            <option value="full">Full</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">Event</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Location</th>
                <th className="pb-2 pr-4 font-medium">{status === 'finished' ? 'Date' : 'Planned'}</th>
                {status === 'finished' && <th className="pb-2 pr-4 font-medium">Time</th>}
                <th className="pb-2 pr-4 font-medium">Goal</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(event => (
                <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {event.website ? (
                        <a href={event.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 underline underline-offset-2">
                          {event.name}
                        </a>
                      ) : event.name}
                      {event.stravaUrl && (
                        <a
                          href={event.stravaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Strava"
                          className="shrink-0 text-[#FC4C02] hover:opacity-75 transition-opacity"
                        >
                          <StravaIcon className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass(event)}`}>
                      {formatEventType(event)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{formatLocation(event)}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      {formatDate(status === 'finished' ? (event.finishedDate ?? event.plannedDate) : event.plannedDate)}
                      {status === 'planned' && (() => {
                        const t = timeUntil(event.plannedDate);
                        return (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide ${t.bgClass} ${t.textColorClass}`}>
                            {t.text}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  {status === 'finished' && (
                    <td className="py-3 pr-4 font-mono text-slate-700">{formatTime(event.finishedTime)}</td>
                  )}
                  <td className="py-3 pr-4 font-mono text-slate-400">{formatTime(event.goalFinishTime)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(event)}
                        className="text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${event.name}"?`)) deleteEvent.mutate(event.id);
                        }}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
