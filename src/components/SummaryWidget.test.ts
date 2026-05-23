import { describe, it, expect } from 'vitest';
import { buildSummary } from './SummaryWidget';

const TODAY = new Date('2025-06-15T00:00:00');

function iso(daysFromToday: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

const NEAR = iso(30);   // 30 days — within 16 weeks
const FAR  = iso(150);  // 150 days — beyond 16 weeks

describe('buildSummary', () => {
  it('no events at all → getting started', () => {
    expect(buildSummary({ halfs: 0, fulls: 0, others: 0, next: null, today: TODAY }))
      .toBe("just getting started — stay tuned!");
  });

  it('no finished races, upcoming event → first race on deck', () => {
    const result = buildSummary({
      halfs: 0, fulls: 0, others: 0,
      next: { name: 'Boston Marathon', plannedDate: NEAR },
      today: TODAY,
    });
    expect(result).toContain('first race on deck');
    expect(result).toContain('Boston Marathon');
  });

  it('finished races, nothing planned → off-season', () => {
    const result = buildSummary({ halfs: 1, fulls: 1, others: 0, next: null, today: TODAY });
    expect(result).toContain('a half and a marathon');
    expect(result).toContain('in the books');
    expect(result).toContain('off-season');
  });

  it('finished races, event far out → cruising', () => {
    const result = buildSummary({
      halfs: 1, fulls: 1, others: 0,
      next: { name: 'Chicago Marathon', plannedDate: FAR },
      today: TODAY,
    });
    expect(result).toContain('in the books');
    expect(result).toContain('cruising');
    expect(result).toContain('Chicago Marathon');
  });

  it('finished races, upcoming soon, with goal time → gunning for', () => {
    const result = buildSummary({
      halfs: 2, fulls: 0, others: 0,
      next: { name: 'NYC Half', plannedDate: NEAR, goalFinishTime: '1:55:00' },
      today: TODAY,
    });
    expect(result).toContain('2 halves');
    expect(result).toContain('going for');
    expect(result).toContain('1:55:00');
    expect(result).toContain('NYC Half');
  });

  it('finished races, upcoming soon, no goal time → training for', () => {
    const result = buildSummary({
      halfs: 1, fulls: 0, others: 0,
      next: { name: 'LA Marathon', plannedDate: NEAR },
      today: TODAY,
    });
    expect(result).toContain('a half');
    expect(result).toContain('training for');
    expect(result).toContain('LA Marathon');
  });

  describe('countPhrase', () => {
    it('pluralizes halves', () => {
      const r = buildSummary({ halfs: 3, fulls: 0, others: 0, next: null, today: TODAY });
      expect(r).toContain('3 halves');
    });

    it('pluralizes marathons', () => {
      const r = buildSummary({ halfs: 0, fulls: 2, others: 0, next: null, today: TODAY });
      expect(r).toContain('2 marathons');
    });

    it('singular half', () => {
      const r = buildSummary({ halfs: 1, fulls: 0, others: 0, next: null, today: TODAY });
      expect(r).toContain('a half');
    });

    it('singular marathon', () => {
      const r = buildSummary({ halfs: 0, fulls: 1, others: 0, next: null, today: TODAY });
      expect(r).toContain('a marathon');
    });

    it('combines halves and marathons', () => {
      const r = buildSummary({ halfs: 2, fulls: 1, others: 0, next: null, today: TODAY });
      expect(r).toContain('2 halves and a marathon');
    });

    it('other distances only', () => {
      const r = buildSummary({ halfs: 0, fulls: 0, others: 2, next: null, today: TODAY });
      expect(r).toContain('2 races');
      expect(r).toContain('in the books');
    });
  });
});
