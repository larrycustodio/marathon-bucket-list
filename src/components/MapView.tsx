import { useRef, useEffect, useState } from 'react';
import USAMap from './USAMap';
import WorldMap from './WorldMap';
import type { MarathonEvent } from '../types';
import type { MapTab } from '../router';

const TABS: { id: MapTab; label: string }[] = [
  { id: 'usa', label: '🇺🇸 United States' },
  { id: 'world', label: '🌎 World' },
];

interface Props {
  events: MarathonEvent[];
  tab: MapTab;
  onTabChange: (t: MapTab) => void;
}

export default function MapView({ events, tab, onTabChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const height = tab === 'usa' ? Math.round(width * 0.58) : Math.round(width * 0.52);

  const legend = [
    { color: '#16a34a', label: 'Finished' },
    { color: '#ca8a04', label: 'Planned' },
    { color: tab === 'usa' ? '#cbd5e1' : '#93c5fd', label: 'Not yet' },
  ];

  return (
    <div className="bg-white rounded-[4px] shadow-[0_8px_24px_rgba(13,13,18,0.04)] mb-3 relative p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {legend.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} style={{ height }}>
        {tab === 'usa' ? (
          <USAMap width={width} height={height} events={events} />
        ) : (
          <WorldMap width={width} height={height} events={events} />
        )}
      </div>
    </div>
  );
}
