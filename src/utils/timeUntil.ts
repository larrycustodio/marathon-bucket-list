export interface TimeUntilResult {
  text: string;
  colorClass: string;
  bgClass: string;
  textColorClass: string;
}

export function timeUntil(dateStr: string): TimeUntilResult {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { text: 'today', colorClass: 'red', bgClass: 'bg-red-100', textColorClass: 'text-red-700' };
  }

  let text: string;
  if (diffDays < 30) {
    text = `${diffDays}d`;
  } else if (diffDays < 84) {
    text = `${Math.ceil(diffDays / 7)}w`;
  } else if (diffDays < 365) {
    text = `${Math.round(diffDays / 30.44)}mo`;
  } else {
    const yrs = diffDays / 365.25;
    text = `${yrs < 1.5 ? '1' : Math.round(yrs)}y`;
  }

  if (diffDays < 28) {
    return { text, colorClass: 'red', bgClass: 'bg-red-100', textColorClass: 'text-red-700' };
  } else if (diffDays < 56) {
    return { text, colorClass: 'orange', bgClass: 'bg-orange-100', textColorClass: 'text-orange-700' };
  } else {
    return { text, colorClass: 'green', bgClass: 'bg-emerald-100', textColorClass: 'text-emerald-700' };
  }
}
