import { describe, it, expect } from 'vitest';
import {
  RECYCLE_BIN_RETENTION_DAYS,
  isDeleted,
  isActive,
  partitionByDeletion,
  daysUntilPurge,
  isPurgeable,
} from '../recycleBin';
import type { SoftDeletable } from '../recycleBin';

const NOW = new Date('2026-09-01T00:00:00Z');

/** Builds a row deleted `days` before NOW. */
function deletedDaysAgo(id: string, days: number) {
  const at = new Date(NOW.getTime() - days * 86_400_000).toISOString();
  return { id, deleted_at: at, deleted_by: 'admin' };
}

describe('isDeleted', () => {
  it('treats a row with a deletion timestamp as deleted', () => {
    // Arrange
    const row = deletedDaysAgo('prod-1', 1);
    // Act
    const result = isDeleted(row);
    // Assert
    expect(result).toBe(true);
  });

  it('treats a row with a null deleted_at as not deleted', () => {
    expect(isDeleted({ id: 'prod-1', deleted_at: null })).toBe(false);
  });

  it('treats a row with no deleted_at column at all as not deleted', () => {
    // Rows fetched before the soft-delete migration landed have no such column.
    expect(isDeleted({ id: 'prod-1' } as SoftDeletable)).toBe(false);
  });

  it('treats an empty deleted_at string as not deleted', () => {
    expect(isDeleted({ id: 'prod-1', deleted_at: '' })).toBe(false);
  });

  it('treats a whitespace-only deleted_at as not deleted', () => {
    expect(isDeleted({ id: 'prod-1', deleted_at: '   ' })).toBe(false);
  });
});

describe('isActive', () => {
  it('is the exact inverse of isDeleted for a live row', () => {
    expect(isActive({ id: 'prod-1', deleted_at: null })).toBe(true);
  });

  it('is the exact inverse of isDeleted for a deleted row', () => {
    expect(isActive(deletedDaysAgo('prod-1', 3))).toBe(false);
  });
});

describe('partitionByDeletion', () => {
  it('splits a mixed list into active and deleted rows', () => {
    const rows = [
      { id: 'a', deleted_at: null },
      deletedDaysAgo('b', 2),
      { id: 'c', deleted_at: null },
    ];

    const { active, deleted } = partitionByDeletion(rows);

    expect(active.map((r) => r.id)).toEqual(['a', 'c']);
    expect(deleted.map((r) => r.id)).toEqual(['b']);
  });

  it('does not mutate the input list', () => {
    const rows = [{ id: 'a', deleted_at: null }, deletedDaysAgo('b', 1)];

    const result = partitionByDeletion(rows);

    expect(result.active).not.toBe(rows);
    expect(rows).toHaveLength(2);
  });

  it('handles an empty list without throwing', () => {
    expect(partitionByDeletion([])).toEqual({ active: [], deleted: [] });
  });

  it('puts every row in active when nothing is deleted', () => {
    const rows: SoftDeletable[] = [{}, { deleted_at: null }];

    const { active, deleted } = partitionByDeletion(rows);

    expect(active).toHaveLength(2);
    expect(deleted).toHaveLength(0);
  });
});

describe('daysUntilPurge', () => {
  it('gives an admin the full retention window on the day of deletion', () => {
    expect(daysUntilPurge(deletedDaysAgo('a', 0), NOW)).toBe(RECYCLE_BIN_RETENTION_DAYS);
  });

  it('counts down as the deletion ages', () => {
    expect(daysUntilPurge(deletedDaysAgo('a', 10), NOW)).toBe(RECYCLE_BIN_RETENTION_DAYS - 10);
  });

  it('reports zero once the retention window has elapsed', () => {
    expect(daysUntilPurge(deletedDaysAgo('a', RECYCLE_BIN_RETENTION_DAYS), NOW)).toBe(0);
  });

  it('never reports a negative number for a long-expired row', () => {
    expect(daysUntilPurge(deletedDaysAgo('a', 400), NOW)).toBe(0);
  });

  it('returns null for a row that was never deleted', () => {
    expect(daysUntilPurge({ id: 'a', deleted_at: null }, NOW)).toBeNull();
  });

  it('returns null for an unparseable deletion timestamp instead of throwing', () => {
    expect(daysUntilPurge({ id: 'a', deleted_at: 'not-a-date' }, NOW)).toBeNull();
  });
});

describe('isPurgeable', () => {
  it('protects a freshly deleted row', () => {
    expect(isPurgeable(deletedDaysAgo('a', 1), NOW)).toBe(false);
  });

  it('protects a row on the last day of its retention window', () => {
    expect(isPurgeable(deletedDaysAgo('a', RECYCLE_BIN_RETENTION_DAYS - 1), NOW)).toBe(false);
  });

  it('allows purging once the retention window has fully elapsed', () => {
    expect(isPurgeable(deletedDaysAgo('a', RECYCLE_BIN_RETENTION_DAYS), NOW)).toBe(true);
  });

  it('never reports a live row as purgeable', () => {
    expect(isPurgeable({ id: 'a', deleted_at: null }, NOW)).toBe(false);
  });

  it('refuses to purge a row whose deletion timestamp cannot be read', () => {
    // Safety: an undateable row is never auto-destroyed, it is surfaced for a human.
    expect(isPurgeable({ id: 'a', deleted_at: 'garbage' }, NOW)).toBe(false);
  });
});
