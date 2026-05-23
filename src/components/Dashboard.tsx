import { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useEvents } from '../hooks/useEvents';
import MapView from './MapView';
import EventTable from './EventTable';
import EventForm from './EventForm';
import SummaryPanel from './SummaryPanel';
import type { MarathonEvent } from '../types';
import type { SearchParams, MapTab, EventTypeFilter } from '../router';

export default function Dashboard() {
  const search = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const { data: events = [], isLoading } = useEvents();
  const [editTarget, setEditTarget] = useState<MarathonEvent | null>(null);

  function setParams(updates: Partial<SearchParams>) {
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...updates }), resetScroll: false });
  }

  const tab: MapTab = search.tab ?? 'usa';
  const fs = search.fs ?? '';
  const ff: EventTypeFilter = search.ff ?? 'all';
  const ps = search.ps ?? '';
  const pf: EventTypeFilter = search.pf ?? 'all';

  const finished = events.filter(e => e.status === 'finished');
  const planned = events.filter(e => e.status === 'planned');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Race Event Bucket List</h1>
        <p className="text-slate-500 mt-1 text-sm">Races done and races dreamed of, before 40.</p>
      </div>

      {/* Two-panel layout */}
      <div className="flex items-start gap-4">

        {/* Left panel — summary, lg+ only */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-8">
          <SummaryPanel events={events} finished={finished} planned={planned} />
        </aside>

        {/* Right panel — full width on mobile, flex-1 on lg+ */}
        <div className="flex-1 min-w-0">
          <MapView
            events={events}
            tab={tab}
            onTabChange={t => setParams({ tab: t })}
          />

          {finished.length > 0 && (
            <EventTable
              title={`Finished (${finished.length})`}
              events={finished}
              status="finished"
              search={fs}
              onSearchChange={v => setParams({ fs: v || undefined })}
              typeFilter={ff}
              onTypeFilterChange={v => setParams({ ff: v === 'all' ? undefined : v })}
              onEdit={ev => { setEditTarget(ev); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
            />
          )}

          {planned.length > 0 && (
            <EventTable
              title={`Planned (${planned.length})`}
              events={planned}
              status="planned"
              search={ps}
              onSearchChange={v => setParams({ ps: v || undefined })}
              typeFilter={pf}
              onTypeFilterChange={v => setParams({ pf: v === 'all' ? undefined : v })}
              onEdit={ev => { setEditTarget(ev); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
            />
          )}

          <EventForm
            editTarget={editTarget}
            onClose={() => setEditTarget(null)}
          />
        </div>
      </div>
    </div>
  );
}
