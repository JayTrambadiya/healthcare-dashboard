import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import {
  Alert,
  Box,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router";
import { csvStore } from "../../../stores/csvStore.ts";
import { exportAllRows } from "../../../services/indexdbService.ts";
import { API_BASE_URL } from "../../../constants.ts";
import authFetch from "../../../utils/authFetch.ts";

const PRESIGNED_ENDPOINT = API_BASE_URL + "/upload/presign";

const GenerateMRF: React.FC = observer(() => {
  const navigate = useNavigate();

  const handleSubmit = useCallback(async () => {
    if (csvStore.isGenerating || csvStore.rowCount === 0) return;

    try {
      csvStore.setIsGenerating(true);
      csvStore.setUploadError(null);
      csvStore.setUploadProgress(5);
      csvStore.setS3Url(null);

      const normalizedRows: Record<string, unknown>[] = [];
      await exportAllRows((row) => {
        const { rowIndex, ...rest } = row;
        normalizedRows.push(rest);
      });

      if (normalizedRows.length === 0) {
        throw new Error("No rows found to submit");
      }

      csvStore.setUploadProgress(35);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `mrf_${timestamp}.json`;

      const presignedRes = await authFetch(PRESIGNED_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, contentType: "text/json" }),
      });

      if (!presignedRes.ok) throw new Error("Failed to get presigned URL");

      const presignedJson = await presignedRes.json();
      const { presignedUrl: uploadUrl, s3Key: fileUrl } = presignedJson;
      csvStore.setUploadProgress(65);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: JSON.stringify(normalizedRows),
      });

      if (!uploadRes.ok) throw new Error("Upload to S3 failed");

      csvStore.setUploadProgress(100);
      csvStore.setS3Url(fileUrl ?? uploadUrl.split("?")[0]);

      notifications.show({
        color: "green",
        title: "MRF Generation Started",
        message:
          "process of generating mrf file has been started soon notify you on get done",
      });

      navigate("/mrf-files");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submit failed";
      csvStore.setUploadError(message);
      csvStore.setUploadProgress(0);
    } finally {
      csvStore.setIsGenerating(false);
    }
  }, [navigate]);

  return (
    <Stack gap="lg" className="h-full">
      <Box>
        <Text fw={600} mb="xs">
          Generate MRF
        </Text>
        <Text size="sm" c="dimmed">
          Generate the MRF file by uploading reviewed data to S3 using a
          presigned URL.
        </Text>
      </Box>

      {csvStore.uploadError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Submit Failed"
          color="red"
        >
          {csvStore.uploadError}
        </Alert>
      )}

      {csvStore.s3Url && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Submit Complete"
          color="green"
        >
          File uploaded successfully.
        </Alert>
      )}

      <Group justify="center" align="center">
        <Button
          variant="outline"
          onClick={() => csvStore.previousStep()}
          disabled={csvStore.isGenerating}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={csvStore.isGenerating || csvStore.rowCount === 0}
          loading={csvStore.isGenerating}
        >
          Generate MRF
        </Button>
      </Group>

      {csvStore.s3Url && (
        <Group align="center" gap="xs">
          <Code className="max-w-full overflow-auto p-2">{csvStore.s3Url}</Code>
          <CopyButton value={csvStore.s3Url}>
            {({ copied }) => (
              <Button
                variant={copied ? "light" : "default"}
                size="xs"
                leftSection={<IconCopy size={14} />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </CopyButton>
        </Group>
      )}

      <Modal
        opened={csvStore.isGenerating}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        title="Uploading Data"
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Please wait while we upload your MRF data to S3.
          </Text>
          <Progress value={csvStore.uploadProgress} animated />
          <Text size="sm" fw={600}>
            {csvStore.uploadProgress}% completed
          </Text>
        </Stack>
      </Modal>
    </Stack>
  );
});

export default GenerateMRF;
