/**
 * Table merge layout:
 * - Date-only mode: merged parent replaces children for the whole day once merge_effective_from <= date.
 * - Time mode (staff, scheduled merges): merged parent only when merge_effective_from is set and a reservation on that parent overlaps layoutTime. Immediate merges use date-only behaviour.
 */

export type TableRowForMerge = {
  id: string;
  is_merged?: boolean | null;
  merged_table_ids?: string[] | null;
  merge_effective_from?: string | null;
  is_active?: boolean | null;
  table_number?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export type ReservationLite = {
  table_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
};

function timeToMins(t: string | undefined | null): number {
  if (!t) return 0;
  const p = String(t).slice(0, 5).split(':').map(Number);
  return (p[0] || 0) * 60 + (p[1] || 0);
}

/** True if [probe, probe+1min) lies inside [start, end) in same-day minute space. */
function reservationContainsProbe(
  res: ReservationLite,
  probeMins: number,
  defaultDurationMins: number
): boolean {
  const st = String(res.status || '').toLowerCase();
  if (['cancelled', 'no_show', 'completed'].includes(st)) return false;
  const startM = timeToMins(res.start_time);
  let endM = timeToMins(res.end_time);
  if (!res.end_time || endM <= startM) {
    endM = startM + defaultDurationMins;
  }
  return probeMins >= startM && probeMins < endM;
}

function rowSlotContainsProbe(row: TableRowForMerge, probeMins: number): boolean {
  if (!row.start_time || !row.end_time) return false;
  const startM = timeToMins(row.start_time);
  const endM = timeToMins(row.end_time);
  if (endM <= startM) return false;
  return probeMins >= startM && probeMins < endM;
}

export function isMergeActiveOnDate(row: TableRowForMerge, layoutDate: string): boolean {
  if (!row.is_merged || !row.merged_table_ids || row.merged_table_ids.length === 0) return false;
  const eff = row.merge_effective_from;
  if (eff && eff > layoutDate) return false;
  return true;
}

/** Ids of physical tables hidden because merged parent is active for the whole day (date-only mode). */
export function mergedChildIdsForDate(rows: TableRowForMerge[], layoutDate: string): Set<string> {
  const hidden = new Set<string>();
  for (const r of rows) {
    if (!isMergeActiveOnDate(r, layoutDate)) continue;
    for (const cid of r.merged_table_ids || []) hidden.add(cid);
  }
  return hidden;
}

export type BuildLayoutOpts = {
  /** HH:mm — when set, time-scoped merges are shown only if this time is inside their slot. */
  layoutTime?: string | null;
  reservations?: ReservationLite[];
  defaultDurationMins?: number;
};

/**
 * Tables to show on floor / calendar for `layoutDate`.
 * - Without layoutTime: date-only (calendar, availability) — whole-day merged rows replace children when active on date.
 * - With layoutTime + reservations: staff snapshot — for scheduled merges (merge_effective_from set),
 *   merged parent only when its own slot or a booking on that parent overlaps layoutTime.
 *   Immediate whole-day merges stay merged whenever active on the date.
 */
export function buildLayoutTableRows<T extends TableRowForMerge>(
  rows: T[],
  layoutDate: string,
  opts?: BuildLayoutOpts
): T[] {
  const mergedParents = rows.filter((r) => r.is_merged && r.merged_table_ids && r.merged_table_ids.length > 0);
  const timeScoped = Boolean(opts?.layoutTime?.trim());

  const parentsShowingMerged = new Set<string>();
  const dur = opts?.defaultDurationMins ?? 90;

  for (const m of mergedParents) {
    const eff = m.merge_effective_from;
    if (eff && eff > layoutDate) continue;

    /** Immediate merges are materialized in DB; time-of-day split applies only to scheduled (future-dated) merges. */
    const scheduledLogical =
      m.merge_effective_from != null && String(m.merge_effective_from).trim() !== '';
    const hasMergeSlot = Boolean(m.start_time && m.end_time);

    if (timeScoped) {
      const probe = timeToMins(opts!.layoutTime);
      if (hasMergeSlot) {
        if (rowSlotContainsProbe(m, probe)) parentsShowingMerged.add(m.id);
        continue;
      }
      if (scheduledLogical) {
        const has = (opts!.reservations || []).some(
          (r) => r.table_id === m.id && reservationContainsProbe(r, probe, dur)
        );
        if (has) parentsShowingMerged.add(m.id);
        continue;
      }
    }

    if (hasMergeSlot) {
      continue;
    } else {
      parentsShowingMerged.add(m.id);
    }
  }

  const hiddenChildIds = new Set<string>();
  for (const m of mergedParents) {
    if (!parentsShowingMerged.has(m.id)) continue;
    for (const cid of m.merged_table_ids || []) hiddenChildIds.add(cid);
  }

  const out: T[] = [];
  for (const t of rows) {
    if (t.is_merged) {
      const eff = t.merge_effective_from;
      if (eff && eff > layoutDate) continue;
      if (!parentsShowingMerged.has(t.id)) continue;
      out.push(t);
      continue;
    }
    if (!t.is_active) continue;
    if (hiddenChildIds.has(t.id)) continue;
    out.push(t);
  }
  out.sort((a, b) => String(a.table_number ?? '').localeCompare(String(b.table_number ?? '')));
  return out;
}

/** Candidate physical tables for booking on reservationDate (public + staff availability) — date-only merge. */
export function bookableTableRowsForDate<T extends TableRowForMerge>(
  rows: T[],
  reservationDate: string,
  partySize: number
): T[] {
  const layout = buildLayoutTableRows(rows, reservationDate);
  return layout.filter(
    (t) =>
      (Number((t as { capacity?: number }).capacity) || 0) >= partySize ||
      Boolean((t as { is_mergeable?: boolean }).is_mergeable)
  );
}
