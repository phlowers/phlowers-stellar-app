import { Table } from 'dexie';

/**
 * Atomically replace all records of a Dexie table.
 */
export async function replaceTableData<T>(table: Table<T, any> | undefined, rows: T[]): Promise<void> {
  if (!table) {
    return;
  }

  const db = (table as any).db;
  if (!db) {
    await table.clear();
    await table.bulkAdd(rows);
    return;
  }

  if (typeof db.transaction === 'function') {
    await db.transaction('rw', table, async () => {
      await table.clear();
      await table.bulkAdd(rows);
    });
    return;
  }

  await table.clear();
  await table.bulkAdd(rows);
}
