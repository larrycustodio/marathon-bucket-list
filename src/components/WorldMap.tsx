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

const BG = '#dbeafe';
const FINISHED_COLOR = '#16a34a';
const PLANNED_COLOR = '#ca8a04';
const DEFAULT_COLOR = '#93c5fd';
const STROKE = '#dbeafe';

interface Props {
  width: number;
  height: number;
  events: MarathonEvent[];
}

export default function WorldMap({ width, height, events }: Props) {
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

  if (width < 10) return null;

  return (
    <svg width={width} height={height} style={{ borderRadius: '12px', background: BG }}>
      <Mercator<FeatureShape>
        data={world.features}
        scale={scale}
        translate={[centerX, centerY + 50]}
      >
        {(mercator) => (
          <g>
            <Graticule graticule={(g) => mercator.path(g) || ''} stroke="rgba(255,255,255,0.3)" />
            {mercator.features.map(({ feature, path }, i) => (
              <path
                key={`world-${i}`}
                d={path || ''}
                fill={getColor(feature.properties.name)}
                stroke={STROKE}
                strokeWidth={0.5}
              />
            ))}
          </g>
        )}
      </Mercator>
    </svg>
  );
}
