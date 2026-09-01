// Soft deletion — the "Recently Deleted" bin for admin-managed rows.
//
// Nothing an operator deletes is destroyed on the spot. The row is stamped with
// `deleted_at`, vanishes from every customer-facing surface, and stays
// restorable from the admin recycle bin for RECYCLE_BIN_RETENTION_DAYS.
//
// This exists because the catalog was wiped to zero twice with no audit trail
// and no way back. A delete that cannot be undone is the failure mode; a delete
// that is really an UPDATE is the fix.

/** Shape of any row that participates in soft deletion. */
export interface SoftDeletable {
  deleted_at?: string | null;
  deleted_by?: string | null;
}

/** How long a deleted row stays restorable before it may be purged for good. */
export const RECYCLE_BIN_RETENTION_DAYS = 30;

const MS_PER_DAY = 86_400_000;

/**
 * True when something stamped this row as deleted.
 *
 * Deliberately lenient about the *value*: any non-blank stamp counts, even one
 * that will not parse as a date. Hiding a row we cannot date is safe; showing a
 * deleted product on the storefront is not.
 */
export function isDeleted<T extends SoftDeletable>(row: T): boolean {
  const stamp = row.deleted_at;
  return typeof stamp === 'string' && stamp.trim() !== '';
}

/** True when the row is live — the inverse of {@link isDeleted}. */
export function isActive<T extends SoftDeletable>(row: T): boolean {
  return !isDeleted(row);
}

/** Splits rows into live and binned, without mutating the input. */
export function partitionByDeletion<T extends SoftDeletable>(
  rows: T[]
): { active: T[]; deleted: T[] } {
  const active: T[] = [];
  const deleted: T[] = [];

  for (const row of rows) {
    if (isDeleted(row)) {
      deleted.push(row);
    } else {
      active.push(row);
    }
  }

  return { active, deleted };
}

/** Milliseconds of the deletion stamp, or null when absent or unreadable. */
function parseDeletedAt<T extends SoftDeletable>(row: T): number | null {
  if (!isDeleted(row)) return null;

  const parsed = Date.parse(row.deleted_at as string);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Days left before the row may be purged, clamped to zero. Null when the row is
 * live, or when its stamp cannot be read — both mean "no countdown to show".
 */
export function daysUntilPurge<T extends SoftDeletable>(row: T, now: Date = new Date()): number | null {
  const deletedAt = parseDeletedAt(row);
  if (deletedAt === null) return null;

  const elapsedDays = Math.floor((now.getTime() - deletedAt) / MS_PER_DAY);
  return Math.max(0, RECYCLE_BIN_RETENTION_DAYS - elapsedDays);
}

/**
 * True only when the retention window has fully elapsed. A row whose stamp
 * cannot be read is never purgeable — it is surfaced for a human instead.
 */
export function isPurgeable<T extends SoftDeletable>(row: T, now: Date = new Date()): boolean {
  return daysUntilPurge(row, now) === 0;
}

/**
 * Human label for the purge countdown, e.g. "28 days left", "1 day left",
 * "Purges today". Returns a neutral phrase when the row carries no readable
 * stamp, so a bin row never renders a blank or a NaN.
 */
export function purgeCountdownLabel<T extends SoftDeletable>(row: T, now: Date = new Date()): string {
  const days = daysUntilPurge(row, now);

  if (days === null) return 'No expiry recorded';
  if (days === 0) return 'Purges today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}
