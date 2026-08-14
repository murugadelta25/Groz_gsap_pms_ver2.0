/** Estimate work-order period from cycle time, target qty, and factory shift hours. */

export function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseGsapMinutes(raw) {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Part Master cycle time is stored in seconds (process_time + loading_unloading). */
export function partCycleTimeSeconds(part) {
  if (!part) return null;
  const stored = Number(part.cycle_time);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const sum = (Number(part.process_time) || 0) + (Number(part.loading_unloading) || 0);
  return sum > 0 ? sum : null;
}

export function partCycleTimeMinutes(part) {
  const sec = partCycleTimeSeconds(part);
  return sec == null ? null : sec / 60;
}

export function formatDurationMinutes(mins) {
  const n = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function hhmmToMins(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function enabledShifts(config) {
  return (config?.shifts || [])
    .filter((s) => s && s.enabled && s.start && s.end)
    .slice()
    .sort((a, b) => hhmmToMins(a.start) - hhmmToMins(b.start));
}

function shiftWindowOnDate(dayStart, shift) {
  const start = new Date(dayStart);
  const [sh, sm] = String(shift.start).split(':').map(Number);
  start.setHours(sh || 0, sm || 0, 0, 0);
  const end = new Date(start);
  const [eh, em] = String(shift.end).split(':').map(Number);
  end.setHours(eh || 0, em || 0, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

function shiftBreakMinutes(config, shiftId) {
  const b = config?.breaks?.[shiftId] || {};
  return ['lunch_break', 'tea_break', 'tpm_cleaning', 'other_cleaning', 'management_meeting']
    .reduce((sum, key) => sum + (Number(b[key]) || 0), 0);
}

/**
 * Walk remaining shift windows from `now` until qty * CT minutes are covered.
 * Period Start = calendar date of the first usable shift (today / current shift).
 * Period End = calendar date when the last piece would finish.
 */
export function estimateWorkOrderPeriod({
  now = new Date(),
  config,
  ctMinutes,
  qty,
  ctLabel,
} = {}) {
  const pieces = Number(qty);
  const ct = Number(ctMinutes);
  if (!Number.isFinite(pieces) || pieces <= 0 || !Number.isFinite(ct) || ct <= 0) {
    return null;
  }
  const needed = pieces * ct;
  const ctText = ctLabel || `${ct} min CT`;
  const shifts = enabledShifts(config);
  if (!shifts.length) {
    const start = toLocalISODate(now);
    return {
      startDate: start,
      endDate: start,
      neededMinutes: needed,
      finishAt: now,
      note: `${pieces} pcs × ${ctText} = ${formatDurationMinutes(needed)} (no shift calendar — same day)`,
    };
  }

  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  day0.setDate(day0.getDate() - 1);

  let remaining = needed;
  let startDate = null;
  let finishAt = now;
  const maxDays = 400;

  for (let d = 0; d < maxDays && remaining > 0; d += 1) {
    const day = new Date(day0);
    day.setDate(day0.getDate() + d);
    for (const sh of shifts) {
      const { start, end } = shiftWindowOnDate(day, sh);
      if (end <= now) continue;
      const winStart = start < now ? new Date(now) : start;
      if (winStart >= end) continue;

      const clockMins = (end - winStart) / 60000;
      const fullMins = (end - start) / 60000;
      const breaks = shiftBreakMinutes(config, sh.id);
      const frac = fullMins > 0 ? Math.min(1, clockMins / fullMins) : 1;
      const avail = Math.max(0, clockMins - breaks * frac);
      if (avail <= 0) continue;

      if (!startDate) startDate = toLocalISODate(winStart);

      if (remaining <= avail) {
        finishAt = new Date(winStart.getTime() + remaining * 60000);
        remaining = 0;
        break;
      }
      remaining -= avail;
      finishAt = end;
    }
  }

  if (!startDate) startDate = toLocalISODate(now);
  const endDate = toLocalISODate(finishAt);
  const note = remaining > 0
    ? `Need ${formatDurationMinutes(needed)} but shift calendar could not cover the qty.`
    : `${pieces} pcs × ${ctText} = ${formatDurationMinutes(needed)}, from current shift to ${endDate}`;

  return {
    startDate,
    endDate,
    neededMinutes: needed,
    finishAt,
    note,
  };
}
