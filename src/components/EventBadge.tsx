import type { MarathonEvent } from "../types";

type EventBadgeProps = {
  event: MarathonEvent;
};

export default function EventBadge({ event }: EventBadgeProps) {
  const formatEventType = (event: MarathonEvent): string => {
    if (event.eventType === "other") {
      return event.customDistance != null
        ? `${event.customDistance} ${event.customDistanceUnit ?? "mi"}`
        : "Other";
    }
    return event.eventType === "full" ? "26.2" : "13.1";
  };

  const typeBadgeClass = (event: MarathonEvent): string => {
    if (event.eventType === "full") return "bg-purple-100 text-purple-700";
    if (event.eventType === "half") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass(event)}`}
    >
      {formatEventType(event)}
    </span>
  );
}
