import { useState, useMemo, useRef, type MouseEvent } from 'react';
import { Mercator, Graticule } from '@visx/geo';
import * as topojson from 'topojson-client';
import topology from '../data/world-topo.json';
import type { MarathonEvent } from '../types';

interface FeatureShape {
  type: 'Feature';
  id: string;
  geometry: { coordinates: [number, number][][]; type: 'Polygon' };
  properties: { name: string };
}

// @ts-expect-error topojson typing
const world = topojson.feature(topology, topology.objects.units) as {
  type: 'FeatureCollection';
  features: FeatureShape[];
};

const CONTINENT_MAP: Record<string, string> = {
  // North America
  'united states': 'North America', 'united states of america': 'North America',
  'usa': 'North America', 'u.s.': 'North America', 'u.s.a.': 'North America',
  'canada': 'North America', 'mexico': 'North America', 'cuba': 'North America',
  'guatemala': 'North America', 'panama': 'North America', 'costa rica': 'North America',
  'jamaica': 'North America', 'haiti': 'North America', 'dominican rep.': 'North America',
  'dominican republic': 'North America', 'trinidad and tobago': 'North America',
  'puerto rico': 'North America', 'el salvador': 'North America',
  'honduras': 'North America', 'nicaragua': 'North America', 'belize': 'North America',
  // South America
  'brazil': 'South America', 'argentina': 'South America', 'chile': 'South America',
  'colombia': 'South America', 'peru': 'South America', 'venezuela': 'South America',
  'ecuador': 'South America', 'bolivia': 'South America', 'paraguay': 'South America',
  'uruguay': 'South America', 'guyana': 'South America', 'suriname': 'South America',
  // Europe
  'united kingdom': 'Europe', 'uk': 'Europe', 'great britain': 'Europe',
  'england': 'Europe', 'scotland': 'Europe', 'wales': 'Europe',
  'germany': 'Europe', 'france': 'Europe', 'italy': 'Europe', 'spain': 'Europe',
  'portugal': 'Europe', 'netherlands': 'Europe', 'belgium': 'Europe',
  'switzerland': 'Europe', 'austria': 'Europe', 'sweden': 'Europe',
  'norway': 'Europe', 'denmark': 'Europe', 'finland': 'Europe', 'ireland': 'Europe',
  'poland': 'Europe', 'czech rep.': 'Europe', 'czech republic': 'Europe', 'czechia': 'Europe',
  'slovakia': 'Europe', 'hungary': 'Europe', 'romania': 'Europe', 'bulgaria': 'Europe',
  'greece': 'Europe', 'croatia': 'Europe', 'serbia': 'Europe', 'ukraine': 'Europe',
  'russia': 'Europe', 'belarus': 'Europe', 'iceland': 'Europe', 'estonia': 'Europe',
  'latvia': 'Europe', 'lithuania': 'Europe', 'slovenia': 'Europe', 'albania': 'Europe',
  'north macedonia': 'Europe', 'macedonia': 'Europe', 'bosnia and herz.': 'Europe',
  'bosnia and herzegovina': 'Europe', 'montenegro': 'Europe', 'moldova': 'Europe',
  'cyprus': 'Europe', 'malta': 'Europe', 'luxembourg': 'Europe', 'monaco': 'Europe',
  'andorra': 'Europe', 'liechtenstein': 'Europe', 'san marino': 'Europe',
  'kosovo': 'Europe', 'turkey': 'Europe',
  // Asia
  'japan': 'Asia', 'china': 'Asia', 'south korea': 'Asia', 'korea': 'Asia',
  'north korea': 'Asia', 'india': 'Asia', 'indonesia': 'Asia', 'thailand': 'Asia',
  'vietnam': 'Asia', 'philippines': 'Asia', 'singapore': 'Asia', 'malaysia': 'Asia',
  'taiwan': 'Asia', 'hong kong': 'Asia', 'pakistan': 'Asia', 'bangladesh': 'Asia',
  'sri lanka': 'Asia', 'nepal': 'Asia', 'myanmar': 'Asia', 'cambodia': 'Asia',
  'laos': 'Asia', 'mongolia': 'Asia', 'kazakhstan': 'Asia', 'uzbekistan': 'Asia',
  'azerbaijan': 'Asia', 'georgia': 'Asia', 'armenia': 'Asia',
  'israel': 'Asia', 'jordan': 'Asia', 'lebanon': 'Asia', 'saudi arabia': 'Asia',
  'united arab emirates': 'Asia', 'uae': 'Asia', 'qatar': 'Asia', 'bahrain': 'Asia',
  'kuwait': 'Asia', 'oman': 'Asia', 'iraq': 'Asia', 'iran': 'Asia',
  'afghanistan': 'Asia', 'syria': 'Asia', 'yemen': 'Asia',
  // Africa
  'south africa': 'Africa', 'kenya': 'Africa', 'ethiopia': 'Africa',
  'nigeria': 'Africa', 'egypt': 'Africa', 'ghana': 'Africa', 'tanzania': 'Africa',
  'uganda': 'Africa', 'senegal': 'Africa', "côte d'ivoire": 'Africa',
  'ivory coast': 'Africa', 'cameroon': 'Africa', 'mozambique': 'Africa',
  'madagascar': 'Africa', 'angola': 'Africa', 'zambia': 'Africa',
  'zimbabwe': 'Africa', 'rwanda': 'Africa', 'morocco': 'Africa',
  'algeria': 'Africa', 'tunisia': 'Africa', 'libya': 'Africa',
  'sudan': 'Africa', 's. sudan': 'Africa', 'south sudan': 'Africa',
  'somalia': 'Africa', 'dem. rep. congo': 'Africa', 'congo': 'Africa',
  'mali': 'Africa', 'niger': 'Africa', 'chad': 'Africa', 'mauritania': 'Africa',
  // Oceania
  'australia': 'Oceania', 'new zealand': 'Oceania', 'papua new guinea': 'Oceania',
  'papua n.g.': 'Oceania', 'fiji': 'Oceania', 'solomon is.': 'Oceania',
};

function getContinent(name: string): string {
  return CONTINENT_MAP[name.toLowerCase().trim()] ?? 'Other';
}

function buildStats(events: MarathonEvent[]) {
  const half = events.filter(e => e.eventType === 'half').length;
  const full = events.filter(e => e.eventType === 'full').length;
  const other: Record<string, number> = {};
  for (const e of events.filter(ev => ev.eventType === 'other')) {
    const k = e.customDistance != null
      ? `${e.customDistance} ${e.customDistanceUnit ?? 'mi'}`
      : 'Other';
    other[k] = (other[k] || 0) + 1;
  }
  return { half, full, other };
}

const BG = '#f1f5f9';
const FINISHED_COLOR = '#16a34a';
const PLANNED_COLOR = '#4ade80';
const DEFAULT_COLOR = '#cbd5e1';
const STROKE = '#f8fafc';

interface Props {
  width: number;
  height: number;
  events: MarathonEvent[];
}

interface TooltipState {
  title: string;
  events: MarathonEvent[];
  x: number;
  y: number;
}

function MapTooltip({ tooltip, width, height }: { tooltip: TooltipState; width: number; height: number }) {
  const TIP_W = 180;
  const TIP_H = 110;
  const left = Math.min(tooltip.x + 12, width - TIP_W - 4);
  const top = tooltip.y > height * 0.65 ? Math.max(0, tooltip.y - TIP_H - 8) : tooltip.y + 12;
  const stats = buildStats(tooltip.events);
  const hasAny = tooltip.events.length > 0;

  return (
    <div
      style={{ position: 'absolute', left, top, pointerEvents: 'none', zIndex: 10 }}
      className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[140px]"
    >
      <div className="font-semibold text-slate-800 mb-1.5 text-sm">{tooltip.title}</div>
      {!hasAny ? (
        <div className="text-slate-400 italic">No events</div>
      ) : (
        <div className="space-y-1">
          {stats.half > 0 && (
            <div className="flex justify-between gap-3 text-slate-600">
              <span>13.1 mi</span>
              <span className="font-semibold text-slate-800">{stats.half}</span>
            </div>
          )}
          {stats.full > 0 && (
            <div className="flex justify-between gap-3 text-slate-600">
              <span>26.2 mi</span>
              <span className="font-semibold text-slate-800">{stats.full}</span>
            </div>
          )}
          {Object.entries(stats.other).map(([dist, cnt]) => (
            <div key={dist} className="flex justify-between gap-3 text-slate-600">
              <span>{dist}</span>
              <span className="font-semibold text-slate-800">{cnt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorldMap({ width, height, events }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const continentEventsMap = useMemo(() => {
    const map: Record<string, MarathonEvent[]> = {};
    for (const e of events) {
      const continent = getContinent(e.country);
      if (!map[continent]) map[continent] = [];
      map[continent].push(e);
    }
    return map;
  }, [events]);

  const finishedCountries = new Set(
    events.filter(e => e.status === 'finished').map(e => e.country.toLowerCase())
  );
  const plannedCountries = new Set(
    events.filter(e => e.status === 'planned').map(e => e.country.toLowerCase())
  );

  const getColor = (name: string) => {
    const key = name.toLowerCase();
    if (finishedCountries.has(key)) return FINISHED_COLOR;
    if (plannedCountries.has(key)) return PLANNED_COLOR;
    return DEFAULT_COLOR;
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (width / 630) * 100;

  function getSvgPos(e: MouseEvent<SVGPathElement>): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  if (width < 10) return null;

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg ref={svgRef} width={width} height={height} style={{ borderRadius: '12px', background: BG }}>
        <Mercator<FeatureShape>
          data={world.features}
          scale={scale}
          translate={[centerX, centerY + 50]}
        >
          {(mercator) => (
            <g>
              <Graticule graticule={(g) => mercator.path(g) || ''} stroke="rgba(255,255,255,0.3)" />
              {mercator.features.map(({ feature, path }, i) => {
                const countryName = feature.properties.name;
                const continent = getContinent(countryName);
                return (
                  <path
                    key={`world-${i}`}
                    d={path || ''}
                    fill={getColor(countryName)}
                    stroke={STROKE}
                    strokeWidth={0.5}
                    style={{ cursor: 'default' }}
                    onMouseEnter={(e) => {
                      setTooltip({
                        title: continent,
                        events: continentEventsMap[continent] ?? [],
                        ...getSvgPos(e),
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip(t => t ? { ...t, ...getSvgPos(e) } : null);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </g>
          )}
        </Mercator>
      </svg>
      {tooltip && <MapTooltip tooltip={tooltip} width={width} height={height} />}
    </div>
  );
}
