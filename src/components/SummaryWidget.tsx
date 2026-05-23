import type { MarathonEvent } from '../types';

interface Props {
  events: MarathonEvent[];
  finished: MarathonEvent[];
  planned: MarathonEvent[];
}

function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function timeframe(dateStr: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
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

export default function SummaryWidget({ finished, planned }: Props) {
  const halfs = finished.filter(e => e.eventType === 'half').length;
  const fulls = finished.filter(e => e.eventType === 'full').length;
  const others = finished.filter(e => e.eventType === 'other').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [...planned]
    .filter(e => new Date(e.plannedDate + 'T00:00:00') >= today)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  const next = upcoming[0] ?? null;

  const diffDays = next
    ? Math.ceil((new Date(next.plannedDate + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
    : null;

  // --- Part 1: what I've done ---
  let pastParts: string[] = [];
  if (halfs > 0) pastParts.push(pluralize(halfs, 'half', 'halves'));
  if (fulls > 0) pastParts.push(pluralize(fulls, 'marathon', 'marathons'));
  if (others > 0 && halfs === 0 && fulls === 0)
    pastParts.push(pluralize(others, 'race', 'races'));

  const pastPhrase =
    pastParts.length === 0
      ? null
      : pastParts.length === 1
      ? `so far I've done ${pastParts[0]}`
      : `so far I've done ${pastParts.slice(0, -1).join(', ')} and ${pastParts.at(-1)}`;

  // --- Part 2: what's next ---
  let nextPhrase: string;
  if (!next) {
    nextPhrase = pastPhrase
      ? 'currently in the off-season, recharging'
      : "just getting started — watch this space";
  } else if (diffDays !== null && diffDays <= 112) {
    const where = `${next.name} ${timeframe(next.plannedDate)}`;
    nextPhrase = next.goalFinishTime
      ? `right now I'm gunning for ${next.goalFinishTime} at the ${where}`
      : `right now I'm training for the ${where}`;
  } else {
    nextPhrase = `chillin till the ${next.name} ${timeframe(next.plannedDate)}`;
  }

  // --- Assemble ---
  let summary: string;
  if (!pastPhrase) {
    summary = nextPhrase;
  } else if (!next) {
    summary = `${pastPhrase} — ${nextPhrase}`;
  } else {
    summary = `${pastPhrase}. ${nextPhrase}`;
  }

  return (
    <p className="mt-2 text-slate-700 text-sm font-medium">
      <span className="text-slate-300 select-none text-base leading-none mr-0.5">"</span>
      {summary}
      <span className="text-slate-300 select-none text-base leading-none ml-0.5">"</span>
    </p>
  );
}
