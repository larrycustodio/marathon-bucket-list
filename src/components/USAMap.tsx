import React, { useState, useMemo, useRef } from "react";
import { AlbersUsa } from "@visx/geo";
import { geoCentroid } from "@visx/vendor/d3-geo";
import * as topojson from "topojson-client";
import topology from "../data/usa-topo.json";
import usAbbr from "../data/us-abbr.json";
import type { EventStatus, MarathonEvent } from "../types";

interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: { coordinates: [number, number][][]; type: "Polygon" };
  properties: { name: string };
}

// @ts-expect-error topojson typing
const { features: unitedStates } = topojson.feature(
  topology,
  topology.objects.states,
) as {
  type: "FeatureCollection";
  features: FeatureShape[];
};

const coordOffsets: Record<string, number[]> = {
  FL: [11, 3],
  AK: [0, -4],
  CA: [-7, 0],
  NY: [5, 0],
  MI: [13, 20],
  LA: [-10, -3],
  HI: [-10, 10],
  ID: [0, 10],
  WV: [-2, 4],
  KY: [10, 0],
  TN: [0, 4],
};

const ignoredLabels = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD"];

const BG = "#f1f5f9";
const FINISHED_COLOR = "#16a34a";
const PLANNED_COLOR = "#4ade80";
const DEFAULT_COLOR = "#cbd5e1";
const STROKE = "#f8fafc";

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

function buildStats(events: MarathonEvent[]) {
  const groupedEvents = events.reduce(
    (memo, event) => {
      if (event.eventType === "half" || event.eventType === "full") {
        const typeKey = event.eventType === "half" ? "half" : "full";
        memo[typeKey][event.status]++;
      }
      return memo;
    },
    {
      half: { planned: 0, finished: 0 },
      full: { planned: 0, finished: 0 },
    } as Record<string, Record<EventStatus, number>>,
  );
  const other: Record<string, number> = {};
  for (const e of events.filter((ev) => ev.eventType === "other")) {
    const k =
      e.customDistance != null
        ? `${e.customDistance} ${e.customDistanceUnit ?? "mi"}`
        : "Other";
    other[k] = (other[k] || 0) + 1;
  }
  return {
    half: groupedEvents.half,
    full: groupedEvents.full,
    other,
  };
}

function MapTooltip({
  tooltip,
  width,
  height,
}: {
  tooltip: TooltipState;
  width: number;
  height: number;
}) {
  const TIP_W = 180;
  const TIP_H = 110;
  const left = Math.min(tooltip.x + 12, width - TIP_W - 4);
  const top =
    tooltip.y > height * 0.65
      ? Math.max(0, tooltip.y - TIP_H - 8)
      : tooltip.y + 12;
  const stats = buildStats(tooltip.events);
  const hasAny = tooltip.events.length > 0;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        pointerEvents: "none",
        zIndex: 10,
      }}
      className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[140px]"
    >
      <div className="font-semibold text-slate-800 mb-1.5 text-sm">
        {tooltip.title}
      </div>
      {!hasAny ? (
        <div className="text-slate-400 italic">No events</div>
      ) : (
        <div className="space-y-1">
          {stats.half.finished || stats.half.planned ? (
            <div className="flex justify-between gap-3 text-slate-600">
              <span>13.1 mi</span>
              <span className="font-semibold text-slate-800">
                {stats.half.finished ? stats.half.finished : ""}
                {stats.half.planned ? ` (${stats.half.planned})` : ""}
              </span>
            </div>
          ) : null}
          {stats.full.finished || stats.full.planned ? (
            <div className="flex justify-between gap-3 text-slate-600">
              <span>26.2 mi</span>
              <span className="font-semibold text-slate-800">
                {stats.full.finished ? stats.full.finished : ""}
                {stats.full.planned ? ` (${stats.full.planned})` : ""}
              </span>
            </div>
          ) : null}
          {Object.entries(stats.other).map(([dist, cnt]) => (
            <div
              key={dist}
              className="flex justify-between gap-3 text-slate-600"
            >
              <span>{dist}</span>
              <span className="font-semibold text-slate-800">{cnt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function USAMap({ width, height, events }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const stateEventsMap = useMemo(() => {
    const map: Record<string, MarathonEvent[]> = {};
    for (const e of events) {
      if (e.state && e.state !== "—") {
        const abbr = e.state.toUpperCase();
        if (!map[abbr]) map[abbr] = [];
        map[abbr].push(e);
      }
    }
    return map;
  }, [events]);

  const finishedStates = new Set(
    events
      .filter((e) => e.status === "finished" && e.state !== "—")
      .map((e) => e.state.toUpperCase()),
  );
  const plannedStates = new Set(
    events
      .filter((e) => e.status === "planned" && e.state !== "—")
      .map((e) => e.state.toUpperCase()),
  );

  const getColor = (abbr: string) => {
    if (finishedStates.has(abbr)) return FINISHED_COLOR;
    if (plannedStates.has(abbr)) return PLANNED_COLOR;
    return DEFAULT_COLOR;
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (width + height) / 1.55;

  function getSvgPos(e: React.MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  if (width < 10) return null;

  return (
    <div style={{ position: "relative", width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ borderRadius: "12px", background: BG }}
      >
        <AlbersUsa<FeatureShape>
          data={unitedStates}
          scale={scale}
          translate={[centerX, centerY - 25]}
        >
          {({ features }) =>
            features.map(({ feature, path, projection }, i) => {
              const abbr = (usAbbr as Record<string, string>)[feature.id];
              const coords: [number, number] | null = projection(
                geoCentroid(feature),
              );
              if (coordOffsets[abbr] && coords) {
                coords[0] += coordOffsets[abbr][0];
                coords[1] += coordOffsets[abbr][1];
              }
              const fill = getColor(abbr);
              return (
                <React.Fragment key={`state-${i}`}>
                  <path
                    d={path || ""}
                    fill={fill}
                    stroke={STROKE}
                    strokeWidth={0.7}
                    style={{ cursor: "default" }}
                    onMouseEnter={(e) => {
                      setTooltip({
                        title: feature.properties.name,
                        events: stateEventsMap[abbr] ?? [],
                        ...getSvgPos(e),
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((t) => (t ? { ...t, ...getSvgPos(e) } : null));
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {coords && !ignoredLabels.includes(abbr) && (
                    <text
                      transform={`translate(${coords})`}
                      fontSize={Math.max(width / 90, 8)}
                      fill={fill === DEFAULT_COLOR ? "#64748b" : "#fff"}
                      textAnchor="middle"
                      fontFamily="system-ui, sans-serif"
                      fontWeight={fill !== DEFAULT_COLOR ? "600" : "400"}
                      style={{ pointerEvents: "none" }}
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
      {tooltip && (
        <MapTooltip tooltip={tooltip} width={width} height={height} />
      )}
    </div>
  );
}
