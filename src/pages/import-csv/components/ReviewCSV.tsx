/**
 * ReviewCSV.tsx
 * ─────────────────────────────────────────────────────────────────
 * Step 2: AG Grid in **Infinite Row Model** mode.
 * getRows → csvService.queryRows → IndexedDB → successCallback.
 * Only the ~100 visible rows ever touch JS heap.
 *
 * Features
 *   • Editable cells (cell editing stopped → IDB put + grid refresh)
 *   • Row deletion with confirmation modal (IDB delete + re-index + grid refresh)
 *   • Column filter & sort fully wired through queryRows
 *   • gridKey in MobX forces full datasource reset after mutations
 */

import React, {
    useMemo,
    useCallback,
    useRef,
    useState,
} from "react";
import { observer } from "mobx-react-lite";
import {
    Stack,
    Button,
    Group,
    Box,
    Text,
    Badge,
    Modal,
    ActionIcon,
} from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import type {
    ColDef,
    GridApi,
    GridReadyEvent,
    CellEditingStoppedEvent,
    IDatasource,
    IGetRowsParams,
} from "ag-grid-community";
import { IconTrash } from "@tabler/icons-react";
import { themeQuartz } from "ag-grid-community";

import { csvStore } from "../../../stores/csvStore";
import {
    queryRows,
    updateRow,
    deleteRow,
} from "../../../services/indexdbService";


const skeletonKeyframes = `@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`;

if (typeof document !== "undefined" && !document.getElementById("skeleton-kf")) {
    const s = document.createElement("style");
    s.id = "skeleton-kf";
    s.textContent = skeletonKeyframes;
    document.head.appendChild(s);
}

const SkeletonCellRenderer = () => (
    <div className="ag-custom-loading-cell" style={{ paddingLeft: '10px', lineHeight: '25px' }}>
        <i className="fas fa-spinner fa-pulse"></i> <span> {props.loadingMessage}</span>
    </div>
);

// ─── Datasource factory ────────────────────────────────────────────────────
// Each time gridKey changes we create a new datasource object,
// which forces AG Grid to call getRows from startRow=0 again.

function createDatasource(): IDatasource {
    return {
        getRows: async (params: IGetRowsParams) => {
            try {
                const result = await queryRows({
                    startRow: params.startRow,
                    endRow: params.endRow,
                    filterModel: params.filterModel as Record<
                        string,
                        { filter: string; type: string }
                    >,
                    sortModel: params.sortModel as Array<{
                        colId: string;
                        sort: "asc" | "desc";
                    }>,
                });
                params.successCallback(result.rows, result.lastRow);
            } catch (err) {
                params.failCallback();
            }
        },
    };
}

// ─── Component ────────────────────────────────────────────────────────────

const ReviewCSV: React.FC = observer(() => {
    const gridApiRef = useRef<GridApi | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<{
        rowIndex: number;
        data: Record<string, unknown>;
    } | null>(null);
    const [isMutating, setIsMutating] = useState(false);

    const inferCellDataType = (header: string): string => {
        // csvStore can expose firstRowSample, OR you read it from a ref set on gridReady
        // Simplest: store column types in MobX after first chunk is parsed
        const type = csvStore.columnTypes?.[header];
        if (type === "number")  return "number";
        if (type === "boolean") return "boolean";
        return "text";
    };


    // Column definitions derived from MobX headers (stable — only headers, not data)
    const columnDefs: ColDef[] = useMemo(
        () =>
            csvStore.csvHeaders.map((header) => ({
                field: header,
                headerName: header,
                flex: 1,
                minWidth: 120,
                editable: true,
                cellDataType: "auto",
                filter: inferCellDataType(header) === "number"
                    ? "agNumberColumnFilter"
                    : inferCellDataType(header) === "boolean"
                        ? "agSetColumnFilter"
                        : "agTextColumnFilter",
                sortable: true,
                resizable: true,
                valueGetter: (p: any) => {
                    const v = p.data?.[header];
                    return typeof v === "object" ? JSON.stringify(v) : (v ?? "");
                },
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [csvStore.csvHeaders.join(",")],
    );

    const colDefsWithDelete: ColDef[] = useMemo(
        () => [
            ...columnDefs,
            {
                field: "actions",
                headerName: "",
                width: 56,
                editable: false,
                sortable: false,
                filter: false,
                resizable: false,
                suppressMovable: true,
                pinned: "right" as const,
                cellRenderer: (props: any) => (
                    <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => {
                            setRowToDelete({
                                rowIndex: props.data?.rowIndex ?? props.rowIndex,
                                data: props.data ?? {},
                            });
                            setDeleteModalOpen(true);
                        }}
                    >
                        <IconTrash size={16} />
                    </ActionIcon>
                ),
            },
        ],
        [columnDefs],
    );

    // ── Grid ready ─────────────────────────────────────────────────

    const handleGridReady = useCallback((event: GridReadyEvent) => {
        gridApiRef.current = event.api;
        event.api.setGridOption("datasource", createDatasource());
    }, []);

    // ── Cell edit ──────────────────────────────────────────────────

    const handleCellEditingStopped = useCallback(
        async (event: CellEditingStoppedEvent) => {
            if (
                event.oldValue === event.newValue ||
                !event.colDef.field ||
                event.colDef.field === "actions"
            ) return;

            const rowIdbIndex = (event.data as any)?.rowIndex;
            if (rowIdbIndex == null) return;

            const field = event.colDef.field;
            const rawValue = event.newValue;
            const columnType = csvStore.columnTypes?.[field] ?? "text";

            // ── Coerce value to correct type based on column type ──
            let newValue: string | number | boolean | null;

            if (rawValue === null || rawValue === undefined) {
                newValue = null;

            } else if (columnType === "number") {
                const parsed = Number(rawValue);
                newValue = isNaN(parsed) ? null : parsed;

            } else if (columnType === "boolean") {
                if (typeof rawValue === "boolean") {
                    newValue = rawValue;
                } else {
                    const lower = String(rawValue).toLowerCase().trim();
                    if (lower === "true" || lower === "1" || lower === "yes") newValue = true;
                    else if (lower === "false" || lower === "0" || lower === "no") newValue = false;
                    else newValue = null;
                }

            } else {
                // text — keep existing JSON object detection
                newValue = rawValue;
                if (
                    typeof rawValue === "string" &&
                    (rawValue.startsWith("{") || rawValue.startsWith("["))
                ) {
                    try { newValue = JSON.parse(rawValue); } catch { /* keep as string */ }
                }
            }

            await updateRow(rowIdbIndex, { [field]: newValue });

            const hasSort = (event.api.getColumnState() ?? []).some((c) => !!c.sort);
            const hasFilter = Object.keys(event.api.getFilterModel() ?? {}).length > 0;
            if (hasSort || hasFilter) {
                event.api.setGridOption("datasource", createDatasource());
                csvStore.refreshGrid();
            }
        },
        [],
    );

    // ── Delete ─────────────────────────────────────────────────────

    const handleDeleteRow = useCallback(async () => {
        if (!rowToDelete) return;
        setIsMutating(true);
        try {
            await deleteRow(rowToDelete.rowIndex);
            csvStore.decrementTotalRows();
            gridApiRef.current?.setGridOption("datasource", createDatasource());
            csvStore.refreshGrid();
        } finally {
            setIsMutating(false);
            setDeleteModalOpen(false);
            setRowToDelete(null);
        }
    }, [rowToDelete]);

    // ─────────────────────────────────────────────────────────────────

    const loadingCellRenderer = useCallback(SkeletonCellRenderer, []);
    const loadingCellRendererParams = useMemo(() => {
        return {
            loadingMessage: "One moment please...",
        };
    }, []);

    return (
        <Stack
            gap="lg"
            h="100%"
            style={{ display: "flex", flexDirection: "column" }}
        >
            {/* Header */}
            <Box style={{ flexShrink: 0 }}>
                <Group justify="space-between" mb="xs">
                    <Box>
                        <Text fw={600} mb={4}>
                            Review & Edit Data
                        </Text>
                        <Text size="sm" c="dimmed">
                            Rows are fetched on demand from IndexedDB — only the visible page
                            is in memory. Edit cells inline or delete rows as needed.
                        </Text>
                    </Box>
                    <Badge variant="light" size="lg">
                        {csvStore.totalRows.toLocaleString()} rows
                    </Badge>
                </Group>
            </Box>

            {/* Grid */}
            <Box
                style={{
                    flex: 1,
                    minHeight: 0,
                    border: "1px solid #dee2e6",
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{ height: "100%", width: "100%" }}
                >
                    <AgGridReact
                        // key forces full remount on gridKey change (belt-and-suspenders)
                        key={`grid-${csvStore.gridKey}`}
                        columnDefs={colDefsWithDelete}
                        onGridReady={handleGridReady}
                        theme={themeQuartz}
                        onCellEditingStopped={handleCellEditingStopped}
                        loadingCellRenderer={loadingCellRenderer}
                        loadingCellRendererParams={loadingCellRendererParams}            // ── Infinite Row Model config ────────────────────────
                        rowModelType="infinite"
                        cacheBlockSize={20} // rows fetched per IDB query
                        maxBlocksInCache={10} // ~1 000 rows cached in AG Grid
                        // blockLoadDebounceMillis={100}
                        cacheOverflowSize={2} // extra rows beyond viewport
                        infiniteInitialRowCount={100}
                        rowBuffer={0}
                        // ── Column defaults ──────────────────────────────────
                        defaultColDef={{
                            sortable: true,
                            filter: true,
                            resizable: true,
                            editable: true,
                        }}
                        // ── UX ───────────────────────────────────────────────
                        animateRows={false} // must be false for infinite model
                        domLayout="normal"
                        rowHeight={35}
                        headerHeight={40}

                        suppressCellFocus={false}
                        stopEditingWhenCellsLoseFocus={true}
                        singleClickEdit={false}

                    />
                </div>
            </Box>

            {/* Stats */}
            <Group gap="md" style={{ flexShrink: 0 }}>
                <Box>
                    <Text size="xs" c="dimmed">
                        Total rows
                    </Text>
                    <Text fw={600} size="sm">
                        {csvStore.totalRows.toLocaleString()}
                    </Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">
                        Columns
                    </Text>
                    <Text fw={600} size="sm">
                        {csvStore.csvHeaders.length}
                    </Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">
                        Storage
                    </Text>
                    <Text fw={600} size="sm" c="teal">
                        IndexedDB
                    </Text>
                </Box>
            </Group>

            {/* Nav */}
            <Group justify="space-between" style={{ flexShrink: 0 }}>
                <Button variant="outline" onClick={() => csvStore.previousStep()}>
                    Back to Upload
                </Button>
                <Button
                    onClick={() => csvStore.nextStep()}
                    disabled={csvStore.totalRows === 0}
                >
                    Proceed to Upload
                </Button>
            </Group>

            {/* Delete modal */}
            <Modal
                opened={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setRowToDelete(null);
                }}
                title="Delete row"
                centered
                size="md"
            >
                <Stack gap="md">
                    <Text c="dimmed">
                        Are you sure? This cannot be undone — the row will be removed from
                        IndexedDB and all subsequent rows will be re-indexed.
                    </Text>
                    {rowToDelete && (
                        <Box
                            p="sm"
                            style={{
                                backgroundColor: "#f8f9fa",
                                borderRadius: 6,
                                border: "1px solid #dee2e6",
                                maxHeight: 200,
                                overflowY: "auto",
                            }}
                        >
                            <Text fw={500} size="sm" mb="xs">
                                Row preview
                            </Text>
                            <Group gap="xs" wrap="wrap">
                                {Object.entries(rowToDelete.data)
                                    .filter(([k]) => k !== "rowIndex")
                                    .map(([k, v]) => (
                                        <Box
                                            key={k}
                                            p="xs"
                                            style={{ backgroundColor: "#e7f5ff", borderRadius: 4 }}
                                        >
                                            <Text size="xs" fw={500}>
                                                {k}:{" "}
                                                <Text size="xs" c="dimmed">
                                                    {String(v).slice(0, 50)}
                                                </Text>
                                                {String(v).length > 50 ? "…" : ""}
                                            </Text>
                                        </Box>
                                    ))}
                            </Group>
                        </Box>
                    )}
                    <Group justify="flex-end">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setRowToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button color="red" loading={isMutating} onClick={handleDeleteRow}>
                            Delete row
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
});

export default ReviewCSV;
