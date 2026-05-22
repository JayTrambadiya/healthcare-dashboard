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
 * For truly huge files (millions of rows) you would add IDB indexes
 * per column — but that complicates schema migration, so we defer.
 */

export interface CsvRow {
  rowIndex: number;
  [key: string]: string | number | boolean | null;
}

export interface QueryParams {
  startRow: number;
  endRow: number;
  filterModel?: Record<string, { filter: string; type: string }>;
  sortModel?: Array<{ colId: string; sort: "asc" | "desc" }>;
}

export interface QueryResult {
  rows: CsvRow[];
  lastRow: number; // -1 = more rows exist
}

const DB_NAME = "csv_upload_db";
const STORE_NAME = "csv_rows";
const DB_VERSION = 1;

// ─── Open / upgrade ────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "rowIndex" });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── Clear all rows (called on new file upload) ────────────────────────────

export async function clearAllRows(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear().onsuccess = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Bulk insert a chunk of rows ───────────────────────────────────────────
// Called from the PapaParse chunk callback.
// rowOffset = number of rows already stored before this chunk.

export async function insertChunk(
  rows: Record<string, string | number | boolean | null>[],
  rowOffset: number,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    rows.forEach((row, i) => {
      store.put({ ...row, rowIndex: rowOffset + i });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Total row count ───────────────────────────────────────────────────────

export async function getTotalCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Query rows (used by AG Grid getRows) ─────────────────────────────────
// Strategy:
//   1. Fetch a window of rows from IDB using IDBKeyRange on rowIndex.
//      We over-fetch by 2× the page size to handle filter drop-off.
//   2. Apply filter in JS.
//   3. Apply sort in JS.
//   4. Slice to [startRow, endRow].

export async function queryRows(params: QueryParams): Promise<QueryResult> {
  const { startRow, endRow, filterModel = {}, sortModel = [] } = params;
  const pageSize = endRow - startRow;
  const hasFilters = Object.keys(filterModel).length > 0;
  const hasSort = sortModel.length > 0;

  // If filters or sort are active we must scan ALL rows (no cheap range).
  // Otherwise we can use a key-range scan for O(pageSize) reads.
  const rows =
    hasFilters || hasSort
      ? await fetchAllRows()
      : await fetchRowRange(startRow, endRow + pageSize); // slight over-fetch buffer

  // Apply filter
  const filtered = hasFilters ? applyFilters(rows, filterModel) : rows;

  // Apply sort
  const sorted = hasSort ? applySort(filtered, sortModel) : filtered;

  // Determine if this is the last page
  const totalFiltered = sorted.length;
  const page = sorted.slice(startRow, endRow);
  const lastRow = endRow >= totalFiltered ? totalFiltered : -1;

  return { rows: page, lastRow };
}

// Fetch a contiguous range by rowIndex key
async function fetchRowRange(start: number, end: number): Promise<CsvRow[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const range = IDBKeyRange.bound(start, end - 1);
    const results: CsvRow[] = [];
    const req = store.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value as CsvRow);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// Fetch every row (used when filter/sort is active)
async function fetchAllRows(): Promise<CsvRow[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as CsvRow[]);
    req.onerror = () => reject(req.error);
  });
}

// ─── Filter (mirrors AG Grid text filter types) ────────────────────────────

function applyFilters(
  rows: CsvRow[],
  filterModel: Record<string, { filter: string; type: string }>,
): CsvRow[] {
  return rows.filter((row) =>
    Object.entries(filterModel).every(([col, { filter, type }]) => {
      const cell = String(row[col] ?? "").toLowerCase();
      const term = filter.toLowerCase();
      switch (type) {
        case "contains":
          return cell.includes(term);
        case "notContains":
          return !cell.includes(term);
        case "equals":
          return cell === term;
        case "notEqual":
          return cell !== term;
        case "startsWith":
          return cell.startsWith(term);
        case "endsWith":
          return cell.endsWith(term);
        default:
          return cell.includes(term);
      }
    }),
  );
}

// ─── Sort ──────────────────────────────────────────────────────────────────

function applySort(
  rows: CsvRow[],
  sortModel: Array<{ colId: string; sort: "asc" | "desc" }>,
): CsvRow[] {
  return [...rows].sort((a, b) => {
    for (const { colId, sort } of sortModel) {
      const av = a[colId] ?? "";
      const bv = b[colId] ?? "";
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      if (cmp !== 0) return sort === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

// ─── Single-row mutations ──────────────────────────────────────────────────

export async function updateRow(
  rowIndex: number,
  updates: Partial<CsvRow>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(rowIndex);
    getReq.onsuccess = () => {
      const existing = getReq.result as CsvRow;
      if (!existing) {
        resolve();
        return;
      }
      store.put({ ...existing, ...updates, rowIndex });
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRow(rowIndex: number): Promise<void> {
  // Delete the target row, then re-index all rows after it to keep
  // rowIndex values contiguous (AG Grid depends on this).
  const db = await openDB();
  const all = await fetchAllRows();
  const filtered = all.filter((r) => r.rowIndex !== rowIndex);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear().onsuccess = () => {
      filtered.forEach((row, i) => store.put({ ...row, rowIndex: i }));
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Export all rows as JSON (for S3 upload) ──────────────────────────────

export async function exportAllRows(): Promise<
  Record<string, string | number | boolean | null>[]
> {
  const rows = await fetchAllRows();
  // Strip internal rowIndex from the exported payload
  return rows.map(({ rowIndex: _r, ...rest }) => rest);
}
