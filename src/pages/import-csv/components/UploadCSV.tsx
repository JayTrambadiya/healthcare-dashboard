/**
 * UploadCSV.tsx
 * ─────────────────────────────────────────────────────────────────
 * Step 1: pick a CSV, parse via PapaParse web-worker in 512 KB chunks,
 * write each chunk straight to IndexedDB.  MobX only gets row counts
 * and headers — never the full data array.
 */

import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import {
  Stack,
  FileInput,
  Button,
  Alert,
  Text,
  Box,
  Group,
  Progress,
} from "@mantine/core";
import {
  IconUpload,
  IconAlertCircle,
  IconCheck,
  IconFileTypeCsv,
} from "@tabler/icons-react";
import { parseCSVWithChunks } from "../../../utils/parseCSV";
import { csvStore } from "../../../stores/csvStore";
import {
  resetDatabase,
  insertChunk,
} from "../../../services/indexdbService";

const UploadCSV: React.FC = observer(() => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(
      csvStore.csvFile,
  );
  // Track chunk count locally for the progress bar label
  const chunkCountRef = React.useRef(0);

  const handleFileUpload = useCallback(async (file: File | null) => {
    try {
      if (!file) {
        csvStore.resetStore();
        setSelectedFile(null);
        return;
      }

      if (!file.name.endsWith(".csv")) {
        csvStore.setParseError("Please upload a valid CSV file (.csv)");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      csvStore.setCSVFile(file);
      csvStore.setIsLoading(true);
      csvStore.setParseError(null);
      csvStore.setTotalRows(0);
      csvStore.setIsDbReady(false);
      chunkCountRef.current = 0;

      // Wipe any previous data from a prior upload
      await resetDatabase();

      let rowOffset = 0;
      let headersParsed = false;

      parseCSVWithChunks(
          file,
          async (chunk) => {
            if (chunk.errors.length > 0) {
              csvStore.setParseError(
                  chunk.errors.map((e) => e.message).join("; "),
              );
              csvStore.setIsLoading(false);
              return;
            }

            // Capture headers from first chunk
            if (!headersParsed && chunk.data.length > 0) {
              csvStore.setCsvHeaders(Object.keys(chunk.data[0]));
              const firstRow = chunk.data[1];
              const types = Object.fromEntries(
                  Object.entries(firstRow).map(([k, v]) => [
                    k,
                    typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : "text",
                  ])
              );
              csvStore.setColumnTypes(types);
              headersParsed = true;
            }

            // Write chunk to IndexedDB (non-blocking relative to UI)
            await insertChunk(chunk.data);
            rowOffset += chunk.data.length;
            chunkCountRef.current++;
            if (chunkCountRef.current % 5 === 0) {
              csvStore.setTotalRows(rowOffset);
            }
          },
          () => {
            // PapaParse "complete" fires after all chunks
            csvStore.setTotalRows(rowOffset);
            csvStore.setIsLoading(false);
            if (!csvStore.isDbReady) csvStore.setIsDbReady(true);
          },
          (error) => {
            csvStore.setParseError(error);
            csvStore.setIsLoading(false);
          },
      );
    } catch (err) {
      setSelectedFile(null);
      csvStore.resetStore();
      csvStore.setIsLoading(false);
      console.error(err)
    }
  }, []);

  const handleProceedToGrid = () => {
    if (csvStore.hasData) csvStore.nextStep();
  };

  return (
      <Stack gap="lg">
        <Box>
          <Text fw={600} mb="xs">
            Upload CSV File
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Large files are streamed into IndexedDB in 512 KB chunks via a web
            worker — the UI stays responsive regardless of file size.
          </Text>
        </Box>

        <FileInput
            placeholder="Click to select or drag and drop"
            leftSection={<IconFileTypeCsv size={20} />}
            accept=".csv"
            value={selectedFile}
            onChange={handleFileUpload}
            clearable
            error={!!csvStore.parseError}
        />

        {/* Parsing progress */}
        {csvStore.isLoading && (
            <Stack gap="xs">
              <Alert
                  icon={<IconUpload size={16} />}
                  title="Streaming CSV…"
                  color="blue"
              >
                {csvStore.totalRows.toLocaleString()} rows written to IndexedDB so
                far…
              </Alert>
              <Progress value={100} animated size="sm" />
            </Stack>
        )}

        {/* Error */}
        {csvStore.parseError && !csvStore.isLoading  && (
            <Alert
                icon={<IconAlertCircle size={16} />}
                title="Parsing failed"
                color="red"
            >
              {csvStore.parseError}
            </Alert>
        )}

        {/* Success */}
        {csvStore.hasData && !csvStore.isLoading && !csvStore.parseError && (
            <Alert icon={<IconCheck size={16} />} title="CSV ready" color="green">
              <Text size="sm">
                {csvStore.totalRows.toLocaleString()} rows ·{" "}
                {csvStore.csvHeaders.length} columns stored in IndexedDB
              </Text>
            </Alert>
        )}

        {/* Headers preview */}
        {csvStore.csvHeaders.length > 0 && !csvStore.isLoading && (
            <Box
                p="md"
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: 8,
                  border: "1px solid #dee2e6",
                }}
            >
              <Text fw={500} size="sm" mb="xs">
                Column headers:
              </Text>
              <Group wrap="wrap" gap="xs">
                {csvStore.csvHeaders.map((h, i) => (
                    <Box
                        key={i}
                        px="sm"
                        py={4}
                        style={{
                          backgroundColor: "#e7f5ff",
                          borderRadius: 4,
                          border: "1px solid #b3d9ff",
                        }}
                    >
                      <Text size="xs" fw={500}>
                        {h}
                      </Text>
                    </Box>
                ))}
              </Group>
            </Box>
        )}

        <Group justify="flex-end">
          <Button
              onClick={handleProceedToGrid}
              disabled={!csvStore.hasData || csvStore.isLoading || csvStore.parseError}
          >
            Proceed to Review
          </Button>
        </Group>
      </Stack>
  );
});

export default UploadCSV;
