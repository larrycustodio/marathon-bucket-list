import type { MarathonEvent } from '../types';

// ─── pure logic (exported for tests) ────────────────────────────────────────

export interface NextEvent {
  name: string;
  plannedDate: string;
  goalFinishTime?: string;
}

export interface BuildSummaryInput {
  halfs: number;
  fulls: number;
  others: number;
  next: NextEvent | null;
  today?: Date;
}

function countPhrase(halfs: number, fulls: number, others: number): string {
  const parts: string[] = [];
  if (halfs > 0) parts.push(halfs === 1 ? 'a half' : `${halfs} halves`);
  if (fulls > 0) parts.push(fulls === 1 ? 'a marathon' : `${fulls} marathons`);
  if (others > 0) parts.push(others === 1 ? 'a race' : `${others} races`);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)!}`;
}

function timeframeText(dateStr: string, today: Date): string {
  const target = new Date(dateStr + 'T00:00:00');
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (days <= 1) return 'tomorrow';
  if (days <= 6) return `in ${days} days`;
  if (days <= 13) return 'in about a week';
  if (days <= 20) return 'in 2 weeks';
  if (days <= 34) return 'in about 3 weeks';
  if (days <= 55) return 'next month';
  if (days <= 75) return 'in about 2 months';
  if (days <= 100) return 'in a couple of months';
  const months = Math.round(days / 30.44);
  return `in ${months} months`;
}

export function buildSummary({
  halfs,
  fulls,
  others,
  next,
  today = new Date(),
}: BuildSummaryInput): string {
  const midnight = new Date(today);
  midnight.setHours(0, 0, 0, 0);

  const counts = countPhrase(halfs, fulls, others);
  const hasFinished = halfs > 0 || fulls > 0 || others > 0;

  const diffDays = next
    ? Math.ceil(
        (new Date(next.plannedDate + 'T00:00:00').getTime() - midnight.getTime()) /
          86_400_000
      )
    : null;

  // no events at all
  if (!hasFinished && !next) {
    return "just getting started — stay tuned!";
  }

  // no finished, has upcoming
  if (!hasFinished && next) {
    const tf = timeframeText(next.plannedDate, midnight);
    return `first race on deck — ${next.name} ${tf}`;
  }

  // has finished, nothing planned
  if (!next) {
    return `${counts} in the books — off-season mode, recharging`;
  }

  // has finished, upcoming is far out (> 16 weeks)
  if (diffDays! > 112) {
    const tf = timeframeText(next.plannedDate, midnight);
    return `${counts} in the books — just cruising till ${next.name} ${tf}`;
  }

  // has finished, upcoming soon — with goal time
  const tf = timeframeText(next.plannedDate, midnight);
  if (next.goalFinishTime) {
    return `${counts} done — going for ${next.goalFinishTime} at ${next.name} ${tf}`;
  }

  // has finished, upcoming soon — no goal time
  return `${counts} done — training for ${next.name} ${tf}`;
}

// ─── component ──────────────────────────────────────────────────────────────

interface Props {
  events: MarathonEvent[];
  finished: MarathonEvent[];
  planned: MarathonEvent[];
}

export default function SummaryWidget({ finished, planned }: Props) {
  const halfs = finished.filter(e => e.eventType === 'half').length;
  const fulls = finished.filter(e => e.eventType === 'full').length;
  const others = finished.filter(e => e.eventType === 'other').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [...planned]
    .filter(e => new Date(e.plannedDate + 'T00:00:00') >= today)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  const nextRaw = upcoming[0] ?? null;

  const summary = buildSummary({
    halfs,
    fulls,
    others,
    next: nextRaw
      ? { name: nextRaw.name, plannedDate: nextRaw.plannedDate, goalFinishTime: nextRaw.goalFinishTime }
      : null,
    today,
  });

  return (
    <p className="mt-2 text-slate-700 text-sm font-medium">
      <span className="select-none text-base leading-none mr-0.5">"</span>
      {summary}
      <span className="select-none text-base leading-none ml-0.5">"</span>
    </p>
  );
}
