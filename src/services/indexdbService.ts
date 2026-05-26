/**
 * csvService.ts
 * ─────────────────────────────────────────────────────────────────
 * All IndexedDB operations for the CSV workflow.
 * MobX store holds ONLY metadata (totalRows, headers, step, status).
 * Every row lives here — never in RAM as a full array.
 *
 * Store layout
 *   DB:    "csv_upload_db"
 *   Store: "csv_rows"
 *   Key:   rowIndex  (auto-incremented keyPath)
 *   Index: none needed — we use IDBKeyRange for range scans
 *
 * Filtering / sorting is done in JS after fetching the relevant
 * window, which is fine for up to ~500 k rows on modern hardware.
 */

import { Dexie, type EntityTable } from "dexie";

// Generate a unique DB name per tab, persisted for the tab's lifetime
const getTabDbName = (): string => {
  let name = sessionStorage.getItem("csv_db_tab_id");
  if (!name) {
    name = `csv_upload_db_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("csv_db_tab_id", name);
  }
  return name;
};

export interface CsvRow {
  rowIndex?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface QueryParams {
  startRow: number;
  endRow: number;
  filterModel?: Record<string, any>;
  sortModel?: Array<{ colId: string; sort: "asc" | "desc" }>;
}

export interface QueryResult {
  rows: CsvRow[];
  lastRow: number; // -1 = more rows exist
}

const DB_NAME = getTabDbName();
const STORE_NAME = "csv_rows";
const DB_VERSION = 1;

class CsvDB extends Dexie {
  [STORE_NAME]!: EntityTable<CsvRow, number>;

  constructor() {
    super(DB_NAME);

    this.version(DB_VERSION).stores({
      csv_rows: "++rowIndex",
    });
  }
}

export const db = new CsvDB();

// ─── Open / upgrade ────────────────────────────────────────────────────────
export async function openDB(): Promise<void> {
  if (!db.isOpen()) {
    await db.open();
  }
}

// ─── Clear all rows (called on new file upload) ────────────────────────────
export async function clearAllRows(): Promise<void> {
  await db.csv_rows.clear();
}

export async function resetDatabase(): Promise<void> {
  if (db.isOpen()) db.close();
  await Dexie.delete(db.name); // ← use db.name instead of DB_NAME constant
  await db.open();
}

// ─── Bulk insert a chunk of rows ───────────────────────────────────────────
// Called from the PapaParse chunk callback.
export async function insertChunk(rows: Record<string, any>[]): Promise<void> {
  if (!rows.length) return;
  await db.csv_rows.bulkAdd(rows); // Dexie assigns rowIndex automatically
}
// ─── Total row count ───────────────────────────────────────────────────────
export async function getTotalCount(): Promise<number> {
  return db.csv_rows.count();
}

// ─── Query rows (used by AG Grid getRows) ─────────────────────────────────
export async function queryRows(params: QueryParams): Promise<QueryResult> {
  const { startRow, endRow, filterModel = {}, sortModel = [] } = params;

  const pageSize = endRow - startRow;

  const hasFilters = Object.keys(filterModel).length > 0;

  const hasSort = sortModel.length > 0;

  if (!hasFilters && !hasSort) {
    const [rows, totalCount] = await Promise.all([
      db.csv_rows
        .orderBy("rowIndex")
        .offset(startRow)
        .limit(pageSize)
        .toArray(),

      db.csv_rows.count(),
    ]);

    return {
      rows,
      lastRow: endRow >= totalCount ? totalCount : -1,
    };
  }

  /**
   * FILTERED COLLECTION
   *
   * Uses IndexedDB cursor iteration.
   * Avoids loading full DB first.
   */
  const collection = db.csv_rows
    .orderBy("rowIndex")
    .filter((row) => matchesFilters(row, filterModel));

  /**
   * COUNT FILTERED ROWS
   */
  const totalFiltered = await collection.count();

  /**
   * NO SORT
   *
   * Fully paginated in IndexedDB.
   */
  if (!hasSort) {
    const rows = await collection.offset(startRow).limit(pageSize).toArray();

    return {
      rows,
      lastRow: endRow >= totalFiltered ? totalFiltered : -1,
    };
  }

  /**
   * SORT REQUIRED
   *
   * IndexedDB cannot dynamically sort
   * arbitrary non-indexed CSV columns.
   *
   * So:
   * - filter first
   * - sort only filtered subset
   * - paginate after sort
   *
   * Much faster than sorting whole DB.
   */
  const filteredRows = await collection.toArray();

  filteredRows.sort((a, b) => compareRows(a, b, sortModel));

  const page = filteredRows.slice(startRow, endRow);

  return {
    rows: page,
    lastRow: endRow >= totalFiltered ? totalFiltered : -1,
  };
}

// @ts-ignore
async function fetchRowRange(start: number, end: number): Promise<CsvRow[]> {
  return db.csv_rows
    .orderBy("rowIndex")
    .offset(start)
    .limit(end - start)
    .toArray();
}

export async function fetchAllRows(): Promise<CsvRow[]> {
  return db.csv_rows.toArray();
}

// ─── Filter (mirrors AG Grid text filter types) ────────────────────────────
/**
 * Filter matcher
 *
 * AG Grid filterModel compatible
 */
function matchesFilters(
  row: CsvRow,
  filterModel: Record<string, any>,
): boolean {
  for (const [col, condition] of Object.entries(filterModel)) {
    const cellVal = row[col];

    /**
     * NUMBER FILTERS
     */
    if (condition.filterType === "number") {
      const cell = Number(cellVal);

      const filter = Number(condition.filter);

      const filterTo = Number(condition.filterTo);

      switch (condition.type) {
        case "equals":
          if (cell !== filter) return false;
          break;

        case "notEqual":
          if (cell === filter) return false;
          break;

        case "greaterThan":
          if (!(cell > filter)) return false;
          break;

        case "greaterThanOrEqual":
          if (!(cell >= filter)) return false;
          break;

        case "lessThan":
          if (!(cell < filter)) return false;
          break;

        case "lessThanOrEqual":
          if (!(cell <= filter)) return false;
          break;

        case "inRange":
          if (!(cell >= filter && cell <= filterTo)) {
            return false;
          }
          break;

        case "blank":
          if (cellVal != null && cellVal !== "") {
            return false;
          }
          break;

        case "notBlank":
          if (cellVal == null || cellVal === "") {
            return false;
          }
          break;
      }

      continue;
    }

    /**
     * TEXT FILTERS
     */
    const cell = String(cellVal ?? "").toLowerCase();

    const filter = String(condition.filter ?? "").toLowerCase();

    switch (condition.type) {
      case "contains":
        if (!cell.includes(filter)) return false;
        break;

      case "notContains":
        if (cell.includes(filter)) return false;
        break;

      case "equals":
        if (cell !== filter) return false;
        break;

      case "notEqual":
        if (cell === filter) return false;
        break;

      case "startsWith":
        if (!cell.startsWith(filter)) return false;
        break;

      case "endsWith":
        if (!cell.endsWith(filter)) return false;
        break;

      case "blank":
        if (cell !== "") return false;
        break;

      case "notBlank":
        if (cell === "") return false;
        break;
    }
  }

  return true;
}

/**
 * Multi-column sorting
 *
 * AG Grid sortModel compatible
 */
function compareRows(
  a: CsvRow,
  b: CsvRow,
  sortModel: Array<{
    colId: string;
    sort: "asc" | "desc";
  }>,
): number {
  for (const sort of sortModel) {
    const av = a[sort.colId];

    const bv = b[sort.colId];

    let cmp = 0;

    /**
     * NUMBER SORT
     */
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {

    /**
     * STRING SORT
     */
      cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    if (cmp !== 0) {
      return sort.sort === "asc" ? cmp : -cmp;
    }
  }

  return 0;
}

// ─── Single-row mutations ──────────────────────────────────────────────────

export async function updateRow(
  rowIndex: number,
  updates: Partial<CsvRow>,
): Promise<void> {
  await db.csv_rows.update(rowIndex, updates);
}

export async function deleteRow(rowIndex: number): Promise<void> {
  await db.csv_rows.delete(rowIndex);
}

// ─── Export all rows as JSON (for S3 upload) ──────────────────────────────

export async function exportAllRows(
  callback: (row: CsvRow) => void | Promise<void>,
): Promise<void> {
  await db.csv_rows.orderBy("rowIndex").each(async (row) => {
    await callback(row);
  });
}
