import { useRef, useState, useEffect, type KeyboardEvent } from 'react';

interface Props {
  value?: string;        // stored as "H:MM:SS"
  onChange: (value: string | undefined) => void;
  className?: string;
}

function parse(v?: string): [string, string, string] {
  if (!v) return ['', '', ''];
  const parts = v.split(':');
  if (parts.length === 3) return [parts[0], parts[1], parts[2]];
  return ['', '', ''];
}

function toStoredValue(h: string, m: string, s: string): string | undefined {
  if (!h && !m && !s) return undefined;
  const hh = parseInt(h || '0', 10);
  const mm = parseInt(m || '0', 10);
  const ss = parseInt(s || '0', 10);
  if (isNaN(hh) || isNaN(mm) || isNaN(ss)) return undefined;
  return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const SEGMENT = 'w-7 bg-transparent border-none outline-none text-center font-mono text-sm text-slate-900 placeholder-slate-300';

export default function MarathonTimeInput({ value, onChange, className }: Props) {
  const [hrs, setHrs] = useState(() => parse(value)[0]);
  const [min, setMin] = useState(() => parse(value)[1]);
  const [sec, setSec] = useState(() => parse(value)[2]);

  // Track the last value we emitted ourselves so the sync effect
  // doesn't overwrite local state mid-typing.
  const lastEmitted = useRef<string | undefined>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      const [h, m, s] = parse(value);
      setHrs(h);
      setMin(m);
      setSec(s);
      lastEmitted.current = value;
    }
  }, [value]);

  function emit(h: string, m: string, s: string) {
    const stored = toStoredValue(h, m, s);
    lastEmitted.current = stored;
    onChange(stored);
  }

  const hrsRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const secRef = useRef<HTMLInputElement>(null);

  function handleHrs(raw: string) {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setHrs(clean);
    emit(clean, min, sec);
    if (clean.length === 2) minRef.current?.focus();
  }

  function handleMin(raw: string) {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setMin(clean);
    emit(hrs, clean, sec);
    if (clean.length === 2) secRef.current?.focus();
  }

  function handleSec(raw: string) {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setSec(clean);
    emit(hrs, min, clean);
  }

  // Validate on blur: reset to "00" if > 59
  function handleMinBlur() {
    const n = parseInt(min, 10);
    if (min !== '' && n > 59) {
      setMin('00');
      emit(hrs, '00', sec);
    }
  }

  function handleSecBlur() {
    const n = parseInt(sec, 10);
    if (sec !== '' && n > 59) {
      setSec('00');
      emit(hrs, min, '00');
    }
  }

  function onKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    current: string,
    prev?: React.RefObject<HTMLInputElement | null>,
    next?: React.RefObject<HTMLInputElement | null>,
  ) {
    if (e.key === 'Backspace' && current === '' && prev) {
      e.preventDefault();
      prev.current?.focus();
    }
    if (e.key === 'ArrowRight' && next) next.current?.focus();
    if (e.key === 'ArrowLeft' && prev) prev.current?.focus();
  }

  return (
    <div
      className={`flex items-center border border-slate-200 rounded-lg px-3 py-2 gap-0.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-shadow ${className ?? ''}`}
    >
      <input
        ref={hrsRef}
        type="text"
        inputMode="numeric"
        value={hrs}
        onChange={e => handleHrs(e.target.value)}
        onKeyDown={e => onKeyDown(e, hrs, undefined, minRef)}
        placeholder="00"
        maxLength={2}
        className={SEGMENT}
        aria-label="hours"
      />
      <span className="text-slate-400 text-xs select-none">hrs</span>
      <span className="text-slate-300 text-xs select-none mx-1">,</span>
      <input
        ref={minRef}
        type="text"
        inputMode="numeric"
        value={min}
        onChange={e => handleMin(e.target.value)}
        onBlur={handleMinBlur}
        onKeyDown={e => onKeyDown(e, min, hrsRef, secRef)}
        placeholder="00"
        maxLength={2}
        className={SEGMENT}
        aria-label="minutes"
      />
      <span className="text-slate-400 text-xs select-none">min</span>
      <span className="text-slate-300 text-xs select-none mx-1">,</span>
      <input
        ref={secRef}
        type="text"
        inputMode="numeric"
        value={sec}
        onChange={e => handleSec(e.target.value)}
        onBlur={handleSecBlur}
        onKeyDown={e => onKeyDown(e, sec, minRef, undefined)}
        placeholder="00"
        maxLength={2}
        className={SEGMENT}
        aria-label="seconds"
      />
      <span className="text-slate-400 text-xs select-none">sec</span>
    </div>
  );
}
