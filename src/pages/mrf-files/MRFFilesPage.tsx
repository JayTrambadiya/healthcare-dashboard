import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import AppNavbar from "../../components/common/AppNavbar";
import { fetchAllJobs, type JobRecord } from "../../services/api/jobsApi";
import { JOB_STATUS } from "../../utils/enums.ts";

type MRFFilesPageProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
};

type GridRow = Omit<JobRecord, "presignedUrl" | "s3Key">;

const getStatusBadgeStyles = (status?: string) => {
  switch ((status ?? "").toUpperCase()) {
    case JOB_STATUS.DONE:
      return {
        backgroundColor: "#e8f7ec",
        color: "#2B8A3E",
        borderColor: "#b7e3c2",
      };
    case JOB_STATUS.PROCESSING:
      return {
        backgroundColor: "#e7f7f7",
        color: "#2D6A6A",
        borderColor: "#b1eeed",
      };
    case JOB_STATUS.PENDING:
      return {
        backgroundColor: "#fff4e8",
        color: "#E67E22",
        borderColor: "#ffd8a8",
      };
    case JOB_STATUS.FAILED:
      return {
        backgroundColor: "#fdeaea",
        color: "#C92A2A",
        borderColor: "#f5c2c2",
      };
    default:
      return {
        backgroundColor: "#edeeed",
        color: "#414941",
        borderColor: "#c1c9be",
      };
  }
};

const MRFFilesPage: React.FC<MRFFilesPageProps> = ({
  isDark,
  onToggleTheme,
  onLogout,
}) => {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const jobs = await fetchAllJobs(false);
        if (!mounted) return;
        setRows(jobs);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load jobs");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      { field: "jobId", headerName: "Job ID", minWidth: 260, flex: 2 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 150,
        cellRenderer: (p: { value?: string }) => {
          const badgeStyles = getStatusBadgeStyles(p.value);
          return (
            <Badge
              variant="light"
              radius="sm"
              style={{
                backgroundColor: badgeStyles.backgroundColor,
                color: badgeStyles.color,
                border: `1px solid ${badgeStyles.borderColor}`,
                fontWeight: 600,
              }}
            >
              {(p.value ?? "-").toUpperCase()}
            </Badge>
          );
        },
      },
      {
        field: "createdAt",
        headerName: "Created At",
        minWidth: 190,
        valueFormatter: ({ value }) =>
          value ? new Date(value).toLocaleString() : "-",
      },
      {
        field: "updatedAt",
        headerName: "Updated At",
        minWidth: 190,
        valueFormatter: ({ value }) =>
          value ? new Date(value).toLocaleString() : "-",
      },
      {
        field: "mrfFileUrl",
        headerName: "MRF URL",
        minWidth: 180,
        cellRenderer: (p: { value?: string }) =>
          p.value ? (
            <a
              href={p.value}
              target="_blank"
              rel="noreferrer"
              className="text-teal-700 underline"
            >
              Open File
            </a>
          ) : (
            "-"
          ),
      },
      {
        headerName: "Public View",
        minWidth: 140,
        cellRenderer: (p: { data?: GridRow }) =>
          p.data?.jobId ? (
            <Button
              component={Link}
              to={`/public/mrf-file-view/${p.data.jobId}`}
              size="xs"
              variant="light"
            >
              View
            </Button>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen">
      <AppNavbar
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      />

      <div className="mx-auto max-w-[1400px] p-6">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title
              order={2}
              style={{
                color:
                  "light-dark(var(--mantine-color-primary-8), var(--mantine-color-primary-2))",
              }}
            >
              MRF Files
            </Title>
            <Badge variant="light" color="teal">
              {rows.length} jobs
            </Badge>
          </Group>

          {error && <Alert color="red">{error}</Alert>}

          <Card withBorder p="md">
            {loading ? (
              <Group justify="center" py="xl">
                <Loader size="sm" />
              </Group>
            ) : (
              <div style={{ height: 560 }}>
                <AgGridReact<GridRow>
                  rowData={rows}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true,
                  }}
                  theme={themeQuartz}
                  rowHeight={38}
                  headerHeight={42}
                />
              </div>
            )}
          </Card>
        </Stack>
      </div>
    </div>
  );
};

export default observer(MRFFilesPage);
