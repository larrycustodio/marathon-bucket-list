import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import type {
  MarathonEvent,
  MarathonEventInput,
  EventType,
  DistanceUnit,
} from "../types";
import { useCreateEvent, useUpdateEvent } from "../hooks/useEvents";
import MarathonTimeInput from "./MarathonTimeInput";
import StravaIcon from "./StravaIcon";

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const BLANK: MarathonEventInput = {
  name: "",
  eventType: "half",
  plannedDate: "",
  city: "",
  state: "CA",
  country: "United States",
};

function toDateOrNull(s?: string) {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date | null) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isPastOrToday(d: Date | null): boolean {
  if (!d) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
}

interface EventFormProps {
  editTarget?: MarathonEvent | null;
  onClose?: () => void;
}

export default function EventForm({ editTarget, onClose }: EventFormProps) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const [form, setForm] = useState<MarathonEventInput>(BLANK);
  const [raceDate, setRaceDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof MarathonEventInput, string>>
  >({});

  useEffect(() => {
    if (editTarget) {
      setForm({
        name: editTarget.name,
        eventType: editTarget.eventType,
        plannedDate: editTarget.plannedDate,
        finishedTime: editTarget.finishedTime,
        goalFinishTime: editTarget.goalFinishTime,
        customDistance: editTarget.customDistance,
        customDistanceUnit: editTarget.customDistanceUnit,
        city: editTarget.city,
        state: editTarget.state,
        country: editTarget.country,
        website: editTarget.website,
        stravaUrl: editTarget.stravaUrl,
      });
      setRaceDate(toDateOrNull(editTarget.plannedDate));
    } else {
      setForm(BLANK);
      setRaceDate(null);
    }
    setErrors({});
  }, [editTarget]);

  function set<K extends keyof MarathonEventInput>(
    key: K,
    val: MarathonEventInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleRaceDateChange(d: Date | null) {
    setRaceDate(d);
    set("plannedDate", toIso(d));
    // Clear finished time if moving to a future date
    if (d && !isPastOrToday(d)) {
      set("finishedTime", undefined);
    }
  }

  const isCompleted = isPastOrToday(raceDate);

  function validate() {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!raceDate) errs.plannedDate = "Required";
    if (
      form.eventType === "other" &&
      (form.customDistance == null || isNaN(form.customDistance))
    ) {
      errs.customDistance = "Required";
    }
    if (!form.state.trim()) errs.state = "Required";
    if (form.state === "—" && !form.country.trim())
      errs.country = "Required for international events";
    else if (!form.country.trim()) errs.country = "Required";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const iso = toIso(raceDate);
    const payload: MarathonEventInput = {
      ...form,
      plannedDate: iso,
      // finishedDate is implied by the race date when it's past/today
      finishedDate: isCompleted ? iso : undefined,
      // clear finished time if saving as future
      finishedTime: isCompleted ? form.finishedTime : undefined,
    };

    if (editTarget) {
      await updateEvent.mutateAsync({ id: editTarget.id, updates: payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    setForm(BLANK);
    setRaceDate(null);
    setErrors({});
    onClose?.();
  }

  const isEditing = !!editTarget;
  const isPending = createEvent.isPending || updateEvent.isPending;

  const FIELD =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="bg-white rounded-[4px] shadow-[0_8px_24px_rgba(13,13,18,0.04)] mb-3 relative p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-5">
        {isEditing ? "Edit Event" : "Add Event"}
      </h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Chicago Marathon"
              className={`${FIELD} ${errors.name ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Event Type *
            </label>
            <select
              value={form.eventType}
              onChange={(e) => set("eventType", e.target.value as EventType)}
              className={`${FIELD} border-slate-200`}
            >
              <option value="half">Half Marathon</option>
              <option value="full">Marathon</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Custom Distance — only for "other" */}
          {form.eventType === "other" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Distance *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.customDistance ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set(
                      "customDistance",
                      v === ""
                        ? undefined
                        : parseFloat(parseFloat(v).toFixed(2)),
                    );
                  }}
                  placeholder="0.00"
                  className={`${FIELD} flex-1 min-w-[80px] ${errors.customDistance ? "border-red-400" : "border-slate-200"}`}
                />
                <select
                  value={form.customDistanceUnit ?? "mi"}
                  onChange={(e) =>
                    set("customDistanceUnit", e.target.value as DistanceUnit)
                  }
                  className={`${FIELD} border-slate-200 w-auto`}
                >
                  <option value="mi">mi</option>
                  <option value="km">km</option>
                </select>
              </div>
              {errors.customDistance && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.customDistance}
                </p>
              )}
            </div>
          )}

          {/* Race Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Race Date *
              {raceDate && (
                <span
                  className={`ml-2 font-normal ${isCompleted ? "text-emerald-600" : "text-green-400"}`}
                >
                  {isCompleted ? "— completed" : "— upcoming"}
                </span>
              )}
            </label>
            <DatePicker
              selected={raceDate}
              onChange={handleRaceDateChange}
              dateFormat="MMM d, yyyy"
              placeholderText="Select race date"
              className={`${FIELD} ${errors.plannedDate ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.plannedDate && (
              <p className="text-red-500 text-xs mt-1">{errors.plannedDate}</p>
            )}
          </div>

          {/* Goal Finish Time — always shown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Goal Finish Time
            </label>
            <MarathonTimeInput
              value={form.goalFinishTime}
              onChange={(v) => set("goalFinishTime", v)}
              className="w-full"
            />
          </div>

          {/* Finished Time — only when race date is past/today */}
          {isCompleted && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Finished Time
              </label>
              <MarathonTimeInput
                value={form.finishedTime}
                onChange={(v) => set("finishedTime", v)}
                className="w-full"
              />
            </div>
          )}

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="e.g. Chicago"
              className={`${FIELD} border-slate-200`}
            />
          </div>

          {/* State / Province */}
          <div>
            {form.state === "—" ? (
              <>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  State / Province
                  <span className="ml-1 text-slate-400 font-normal">
                    (optional)
                  </span>
                </label>
                <div className="flex gap-2">
                  <select
                    value="—"
                    onChange={(e) => set("state", e.target.value)}
                    className={`${FIELD} border-slate-200 w-auto`}
                  >
                    <option value="—">🌍 Intl.</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.state === "—" ? "" : form.state}
                    onChange={(e) => set("state", e.target.value || "—")}
                    placeholder="Province / Region"
                    className={`${FIELD} border-slate-200 flex-1`}
                  />
                </div>
              </>
            ) : (
              <>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  State *
                </label>
                <select
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className={`${FIELD} ${errors.state ? "border-red-400" : "border-slate-200"}`}
                >
                  <option value="—">🌍 International</option>
                  <option disabled>──────────</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="text-red-500 text-xs mt-1">{errors.state}</p>
                )}
              </>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Country {form.state === "—" ? "*" : ""}
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="e.g. United States"
              className={`${FIELD} ${errors.country ? "border-red-400" : "border-slate-200"}`}
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Website
            </label>
            <input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value || undefined)}
              placeholder="https://..."
              className={`${FIELD} border-slate-200`}
            />
          </div>

          {/* Strava */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
              <StravaIcon className="w-3.5 h-3.5" />
              Strava Activity
            </label>
            <input
              type="url"
              value={form.stravaUrl ?? ""}
              onChange={(e) => set("stravaUrl", e.target.value || undefined)}
              placeholder="https://www.strava.com/activities/..."
              className={`${FIELD} border-slate-200`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {isEditing && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
