import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useParams } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import {
  fetchJobById,
  fetchPublicJsonFromUrl,
  type JobRecord,
} from "../../services/api/jobsApi";

type JsonRow = Record<string, unknown>;

const PublicMRFFileViewPage: React.FC<{ isDark: boolean }> = () => {
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [jsonData, setJsonData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const details = await fetchJobById(jobId, true);
        if (!mounted) return;
        setJob(details);

        if (details.mrfFileUrl) {
          const raw = await fetchPublicJsonFromUrl(details.mrfFileUrl);
          if (!mounted) return;
          const payload =
            raw && typeof raw === "object" && "data" in raw
              ? (raw as { data?: unknown }).data
              : raw;
          setJsonData(payload ?? []);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load MRF file");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (jobId) {
      void load();
    }

    return () => {
      mounted = false;
    };
  }, [jobId]);

  const jsonRows = useMemo<JsonRow[]>(() => {
    if (Array.isArray(jsonData)) {
      return (jsonData as unknown[]).filter(
        (v): v is JsonRow => typeof v === "object" && v !== null,
      ) as JsonRow[];
    }

    if (jsonData && typeof jsonData === "object") {
      return [jsonData as JsonRow];
    }

    return [];
  }, [jsonData]);

  const jsonCols = useMemo<ColDef<JsonRow>[]>(() => {
    const first = jsonRows[0];
    if (!first) return [];

    return Object.keys(first).map((k) => ({
      field: k,
      headerName: k,
      minWidth: 180,
      flex: 1,
      valueFormatter: (p: { value: unknown }) => {
        if (typeof p.value === "object" && p.value !== null)
          return JSON.stringify(p.value);
        return String(p.value ?? "");
      },
    }));
  }, [jsonRows]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1500px] p-6">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title
              order={2}
              style={{
                color:
                  "light-dark(var(--mantine-color-primary-8), var(--mantine-color-primary-2))",
              }}
            >
              Public MRF File View
            </Title>
            {job?.status && <Badge color="teal">{job.status}</Badge>}
          </Group>

          {error && <Alert color="red">{error}</Alert>}

          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" color="teal" />
            </Group>
          ) : (
            <>
              <Card withBorder p="md">
                <Text fw={600} mb="sm">
                  MRF JSON Preview
                </Text>
                {jsonRows.length > 0 ? (
                  <div style={{ height: 520 }}>
                    <AgGridReact<JsonRow>
                      rowData={jsonRows}
                      columnDefs={jsonCols}
                      defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                      }}
                      theme={themeQuartz}
                    />
                  </div>
                ) : (
                  <Text size="sm" c="dimmed">
                    JSON is not a tabular structure. Use source JSON link for
                    full nested content.
                  </Text>
                )}
              </Card>
            </>
          )}
        </Stack>
      </div>
    </div>
  );
};

export default PublicMRFFileViewPage;
