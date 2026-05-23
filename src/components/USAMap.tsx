import React from 'react';
import { AlbersUsa } from '@visx/geo';
import { geoCentroid } from '@visx/vendor/d3-geo';
import * as topojson from 'topojson-client';
import topology from '../data/usa-topo.json';
import usAbbr from '../data/us-abbr.json';
import type { MarathonEvent } from '../types';

interface FeatureShape {
  type: 'Feature';
  id: string;
  geometry: { coordinates: [number, number][][]; type: 'Polygon' };
  properties: { name: string };
}

// @ts-expect-error topojson typing
const { features: unitedStates } = topojson.feature(topology, topology.objects.states) as {
  type: 'FeatureCollection';
  features: FeatureShape[];
};

const coordOffsets: Record<string, number[]> = {
  FL: [11, 3], AK: [0, -4], CA: [-7, 0], NY: [5, 0],
  MI: [13, 20], LA: [-10, -3], HI: [-10, 10], ID: [0, 10],
  WV: [-2, 4], KY: [10, 0], TN: [0, 4],
};

const ignoredLabels = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD'];

const BG = '#f1f5f9';
const FINISHED_COLOR = '#16a34a';
const PLANNED_COLOR = '#ca8a04';
const DEFAULT_COLOR = '#cbd5e1';
const STROKE = '#f8fafc';

interface Props {
  width: number;
  height: number;
  events: MarathonEvent[];
}

export default function USAMap({ width, height, events }: Props) {
  const finishedStates = new Set(
    events.filter(e => e.status === 'finished').map(e => e.state.toUpperCase())
  );
  const plannedStates = new Set(
    events.filter(e => e.status === 'planned').map(e => e.state.toUpperCase())
  );

  const getColor = (abbr: string) => {
    if (finishedStates.has(abbr)) return FINISHED_COLOR;
    if (plannedStates.has(abbr)) return PLANNED_COLOR;
    return DEFAULT_COLOR;
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (width + height) / 1.55;

  if (width < 10) return null;

  return (
    <svg width={width} height={height} style={{ borderRadius: '12px', background: BG }}>
      <AlbersUsa<FeatureShape>
        data={unitedStates}
        scale={scale}
        translate={[centerX, centerY - 25]}
      >
        {({ features }) =>
          features.map(({ feature, path, projection }, i) => {
            const abbr = (usAbbr as Record<string, string>)[feature.id];
            const coords: [number, number] | null = projection(geoCentroid(feature));
            if (coordOffsets[abbr] && coords) {
              coords[0] += coordOffsets[abbr][0];
              coords[1] += coordOffsets[abbr][1];
            }
            const fill = getColor(abbr);
            return (
              <React.Fragment key={`state-${i}`}>
                <path d={path || ''} fill={fill} stroke={STROKE} strokeWidth={0.7} />
                {coords && !ignoredLabels.includes(abbr) && (
                  <text
                    transform={`translate(${coords})`}
                    fontSize={Math.max(width / 90, 8)}
                    fill={fill === DEFAULT_COLOR ? '#64748b' : '#fff'}
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                    fontWeight={fill !== DEFAULT_COLOR ? '600' : '400'}
                  >
                    {abbr}
                  </text>
                )}
              </React.Fragment>
            );
          })
        }
      </AlbersUsa>
    </svg>
  );
}
