// import React, { useMemo, useCallback, useState } from "react";
// import { observer } from "mobx-react-lite";
// import {
//   Stack,
//   Button,
//   Group,
//   Box,
//   Text,
//   Badge,
//   Modal,
//   ActionIcon,
//   Loader, // <-- Import Loader
//   Center, // <-- Import Center
// } from "@mantine/core";
// import { AgGridReact } from "ag-grid-react";
// import type {
//   ColDef,
//   GridApi,
//   GridReadyEvent,
//   CellEditingStoppedEvent,
//   ValueGetterParams,
// } from "ag-grid-community";
// import { IconTrash } from "@tabler/icons-react";
// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-quartz.css";
// import { csvStore } from "../../../stores/csvStore.ts";

// /**
//  * Step 2: Edit CSV Data in AG Grid
//  * Displays parsed CSV in editable grid with row deletion capability
//  * Allows users to modify cell values and remove rows before upload
//  * Features: Editable cells, row deletion with confirmation, full JSON support
//  */

// const Step2EditGrid: React.FC = observer(() => {
//   const gridApiRef = React.useRef<GridApi | null>(null);
//   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//   const [rowToDelete, setRowToDelete] = useState<number | null>(null);

//   // Define column definitions with editing enabled
//   const columnDefs: ColDef[] = useMemo(() => {
//     return csvStore.csvHeaders.map((header) => ({
//       field: header,
//       headerName: header,
//       flex: 1,
//       minWidth: 120,
//       editable: true, // Enable cell editing
//       cellDataType: "text",
//       filter: "agTextColumnFilter",
//       sortable: true,
//       resizable: true,
//       wrapText: true,
//       autoHeight: false,
//       valueGetter: (params: ValueGetterParams) => {
//         const value = params.data?.[header];
//         // Handle nested objects/arrays
//         if (typeof value === "object") {
//           return JSON.stringify(value);
//         }
//         return value ?? "";
//       },
//     }));
//   }, [csvStore.csvHeaders]);

//   // Add delete column with action button
//   const colDefsWithDelete: ColDef[] = useMemo(() => {
//     return [
//       ...columnDefs,
//       {
//         field: "actions",
//         headerName: "Actions",
//         width: 80,
//         sortable: false,
//         filter: false,
//         resizable: false,
//         suppressMovable: true,
//         pinned: "right",
//         cellRenderer: (props: any) => (
//           <ActionIcon
//             color="red"
//             variant="subtle"
//             size="sm"
//             onClick={() => {
//               setRowToDelete(props.rowIndex);
//               setDeleteModalOpen(true);
//             }}
//             title="Delete row"
//           >
//             <IconTrash size={16} />
//           </ActionIcon>
//         ),
//       },
//     ];
//   }, [columnDefs]);

//   const handleGridReady = (event: GridReadyEvent) => {
//     gridApiRef.current = event.api;
//     // Auto-size columns based on content
//     event.api.autoSizeAllColumns();
//   };

//   const handleCellEditingStopped = (event: CellEditingStoppedEvent) => {
//     // Only update if value actually changed
//     if (event.oldValue !== event.newValue) {
//       const fieldName = event.colDef.field as string;

//       // Skip updating the actions column
//       if (fieldName === "actions") return;

//       // Parse JSON strings if they contain objects
//       let newValue: any = event.newValue;
//       if (typeof event.newValue === "string") {
//         try {
//           // Try to parse as JSON if it looks like JSON
//           if (
//             event.newValue.startsWith("{") ||
//             event.newValue.startsWith("[")
//           ) {
//             newValue = JSON.parse(event.newValue);
//           }
//         } catch (e) {
//           // Keep as string if not valid JSON
//           newValue = event.newValue;
//         }
//       }

//       // Update store with new value
//       csvStore.updateRow(event.rowIndex || 0, {
//         [fieldName]: newValue,
//       });
//     }
//   };

//   const handleDeleteRow = useCallback(() => {
//     if (rowToDelete !== null) {
//       csvStore.deleteRow(rowToDelete);

//       setDeleteModalOpen(false);
//       setRowToDelete(null);
//     }
//   }, [rowToDelete]);

//   const handleCancelDelete = () => {
//     setDeleteModalOpen(false);
//     setRowToDelete(null);
//   };

//   const handleProceedToUpload = () => {
//     csvStore.nextStep();
//   };

//   const handleBackToUpload = () => {
//     csvStore.previousStep();
//   };

//   // Get row data for deletion confirmation
//   const rowDataToDelete =
//     rowToDelete !== null && csvStore.csvData[rowToDelete]
//       ? csvStore.csvData[rowToDelete]
//       : null;

//   console.log("Rendering Step2EditGrid with", JSON.stringify(csvStore.csvData));
//   return (
//     <Stack
//       gap="lg"
//       h="100%"
//       style={{ display: "flex", flexDirection: "column" }}
//     >
//       {/* Header Section */}
//       <Box style={{ flexShrink: 0 }}>
//         <Group justify="space-between" mb="xs">
//           <Box>
//             <Text fw={600} mb="xs">
//               Review & Edit Data
//             </Text>
//             <Text size="sm" c="dimmed">
//               Edit cells directly by clicking on them, or remove rows as needed.
//               All changes will be reflected in the uploaded file.
//             </Text>
//           </Box>
//           <Badge variant="light" size="lg">
//             {csvStore.rowCount} rows
//           </Badge>
//         </Group>
//       </Box>

//       {/* AG Grid Container - Scrollable */}
//       <Box
//         style={{
//           flex: 1,
//           minHeight: 0,
//           border: "1px solid #dee2e6",
//           borderRadius: "8px",
//           overflow: "hidden",
//           backgroundColor: "#fff",
//           display: "flex",
//           flexDirection: "column",
//         }}
//       >
//         <div
//           className="ag-theme-quartz"
//           style={{ height: "100%", width: "100%", flex: 1 }}
//         >
//           <AgGridReact
//             ref={gridApiRef}
//             columnDefs={colDefsWithDelete}
//             rowData={csvStore.csvData.slice(100)}
//             onGridReady={handleGridReady}
//             onCellEditingStopped={handleCellEditingStopped}
//             defaultColDef={{
//               sortable: true,
//               filter: true,
//               resizable: true,
//               editable: true,
//             }}
//             pagination={true}
//             paginationPageSize={10}
//             paginationPageSizeSelector={[10, 25, 50, 100]}
//             animateRows={true}
//             suppressCellFocus={false}
//             stopEditingWhenGridLosesFocus={true}
//             suppressClickEdit={false}
//             singleClickEdit={false}
//             domLayout="normal"
//             rowHeight={35}
//             headerHeight={40}
//           />
//         </div>
//       </Box>

//       {/* Delete Confirmation Modal */}
//       <Modal
//         opened={deleteModalOpen}
//         onClose={handleCancelDelete}
//         title="Delete Row"
//         centered
//         size="md"
//       >
//         <Stack gap="md">
//           <Text c="dimmed">
//             Are you sure you want to delete this row? This action cannot be
//             undone.
//           </Text>

//           {/* Show preview of row data being deleted */}
//           {rowDataToDelete && (
//             <Box
//               p="sm"
//               style={{
//                 backgroundColor: "#f8f9fa",
//                 borderRadius: "6px",
//                 border: "1px solid #dee2e6",
//                 maxHeight: "200px",
//                 overflowY: "auto",
//               }}
//             >
//               <Text fw={500} size="sm" mb="xs">
//                 Row Data:
//               </Text>
//               <Group gap="xs" wrap="wrap">
//                 {Object.entries(rowDataToDelete).map(([key, value]) => (
//                   <Box
//                     key={key}
//                     p="xs"
//                     style={{ backgroundColor: "#e7f5ff", borderRadius: "4px" }}
//                   >
//                     <Text size="xs" fw={500}>
//                       {key}: {String(value).slice(0, 50)}
//                       {String(value).length > 50 ? "..." : ""}
//                     </Text>
//                   </Box>
//                 ))}
//               </Group>
//             </Box>
//           )}

//           {/* Action Buttons */}
//           <Group justify="flex-end">
//             <Button variant="outline" onClick={handleCancelDelete}>
//               Cancel
//             </Button>
//             <Button color="red" onClick={handleDeleteRow}>
//               Delete Row
//             </Button>
//           </Group>
//         </Stack>
//       </Modal>

//       {/* Changes Indicator */}
//       {csvStore.hasChanges && (
//         <Box
//           p="sm"
//           style={{
//             backgroundColor: "#fff3bf",
//             borderRadius: "6px",
//             border: "1px solid #ffd43b",
//           }}
//         >
//           <Text size="sm" fw={500} c="#664d03">
//             ✓ You have made changes to the data ({csvStore.rowCount} rows).
//             These will be reflected in the final upload.
//           </Text>
//         </Box>
//       )}

//       {/* Data Stats */}
//       <Group gap="md">
//         <Box>
//           <Text size="xs" c="dimmed">
//             Total Rows:
//           </Text>
//           <Text fw={600} size="sm">
//             {csvStore.rowCount}
//           </Text>
//         </Box>
//         <Box>
//           <Text size="xs" c="dimmed">
//             Total Columns:
//           </Text>
//           <Text fw={600} size="sm">
//             {csvStore.csvHeaders.length}
//           </Text>
//         </Box>
//         <Box>
//           <Text size="xs" c="dimmed">
//             Status:
//           </Text>
//           <Text fw={600} size="sm" c={csvStore.hasChanges ? "orange" : "green"}>
//             {csvStore.hasChanges ? "Modified" : "Original"}
//           </Text>
//         </Box>
//       </Group>

//       {/* Action Buttons */}
//       <Group justify="space-between">
//         <Button variant="outline" onClick={handleBackToUpload}>
//           Back to Upload
//         </Button>
//         <Button
//           onClick={handleProceedToUpload}
//           disabled={csvStore.rowCount === 0}
//         >
//           Proceed to Upload
//         </Button>
//       </Group>
//     </Stack>
//   );
// });

// export default Step2EditGrid;

/**
 * ReviewCSV.tsx  (updated)
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
  useEffect,
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
    rowCount: undefined, // let AG Grid discover the total dynamically
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

  // Column definitions derived from MobX headers (stable — only headers, not data)
  const columnDefs: ColDef[] = useMemo(
    () =>
      csvStore.csvHeaders.map((header) => ({
        field: header,
        headerName: header,
        flex: 1,
        minWidth: 120,
        editable: true,
        cellDataType: "text",
        filter: "agTextColumnFilter",
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

  // Skeleton bar that pulses while the row is loading from IDB
  const SkeletonCellRenderer = () => (
    <div
      style={{
        height: 16,
        borderRadius: 4,
        background:
          "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s infinite",
        width: `${60 + Math.random() * 30}%`, // varied widths look more natural
      }}
    />
  );

  // ── Grid ready ─────────────────────────────────────────────────

  const handleGridReady = useCallback((event: GridReadyEvent) => {
    gridApiRef.current = event.api;
    event.api.setGridOption("datasource", createDatasource());
  }, []);

  // ── Re-wire datasource whenever MobX gridKey changes ───────────
  // This happens after any write mutation (delete, external update).

  useEffect(() => {
    if (gridApiRef.current) {
      gridApiRef.current.setGridOption("datasource", createDatasource());
    }
  }, [csvStore.gridKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cell edit ──────────────────────────────────────────────────

  const handleCellEditingStopped = useCallback(
    async (event: CellEditingStoppedEvent) => {
      if (
        event.oldValue === event.newValue ||
        !event.colDef.field ||
        event.colDef.field === "actions"
      )
        return;

      const rowIdbIndex = (event.data as any)?.rowIndex;
      if (rowIdbIndex == null) return;

      let newValue: unknown = event.newValue;
      if (
        typeof event.newValue === "string" &&
        (event.newValue.startsWith("{") || event.newValue.startsWith("["))
      ) {
        try {
          newValue = JSON.parse(event.newValue);
        } catch {
          /* keep as string */
        }
      }

      await updateRow(rowIdbIndex, { [event.colDef.field]: newValue as any });
      // No full grid refresh needed — the cell is already showing the new value.
      // If you need downstream recalculations, call csvStore.refreshGrid() here.
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
      csvStore.refreshGrid(); // triggers useEffect → new datasource
    } finally {
      setIsMutating(false);
      setDeleteModalOpen(false);
      setRowToDelete(null);
    }
  }, [rowToDelete]);

  // ─────────────────────────────────────────────────────────────────

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
          className="ag-theme-quartz"
          style={{ height: "100%", width: "100%" }}
        >
          <AgGridReact
            // key forces full remount on gridKey change (belt-and-suspenders)
            key={`grid-${csvStore.gridKey}`}
            columnDefs={colDefsWithDelete}
            onGridReady={handleGridReady}
            theme={themeQuartz}
            onCellEditingStopped={handleCellEditingStopped}
            // ── Infinite Row Model config ────────────────────────
            rowModelType="infinite"
            cacheBlockSize={100} // rows fetched per IDB query
            maxBlocksInCache={10} // ~1 000 rows cached in AG Grid
            cacheOverflowSize={2} // extra rows beyond viewport
            infiniteInitialRowCount={csvStore.totalRows || 1000}
            // ── Column defaults ──────────────────────────────────
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
              editable: true,
              loadingCellRenderer: { SkeletonCellRenderer },
              loadingCellRendererParams: {
                loadingMessage: "One moment please...",
              },
            }}
            // ── UX ───────────────────────────────────────────────
            animateRows={false} // must be false for infinite model
            domLayout="normal"
            rowHeight={35}
            headerHeight={40}
            suppressCellFocus={false}
            stopEditingWhenGridLosesFocus={true}
            suppressServerSideFullWidthLoadingRow={true}
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
