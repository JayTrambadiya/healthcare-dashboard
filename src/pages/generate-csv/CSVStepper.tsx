import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";
import {
  Box,
  Card,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import { IconCloud, IconTable, IconUpload } from "@tabler/icons-react";
import UploadCSV from "./components/UploadCSV.tsx";
import GenerateMRF from "./components/GenerateMRF.tsx";
import { csvStore } from "../../stores/csvStore.ts";
import ReviewCSV from "./components/ReviewCSV.tsx";
import Sidebar from "../../components/common/Sidebar.tsx";

type CSVUploadPageProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
};

const CSVStepper: React.FC<CSVUploadPageProps> = observer(
  ({ isDark, onToggleTheme, onLogout }) => {
    const steps = [
      {
        label: "Step 1",
        description: "Upload CSV",
        icon: <IconUpload size={20} />,
      },
      {
        label: "Step 2",
        description: "Modify and Review",
        icon: <IconTable size={20} />,
      },
      {
        label: "Step 3",
        description: "Submission",
        icon: <IconCloud size={20} />,
      },
    ];

    useEffect(() => {
      return () => {
        csvStore.resetStore();
      };
    }, []);

    const isReviewStep = csvStore.currentStep === 1;

    return (
      <Sidebar
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
        >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className="w-full px-6 py-6"
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              color:
                "light-dark(var(--mantine-color-gray-9), var(--mantine-color-gray-1))",
            }}
          >
            <Stack
              gap="lg"
              h="100%"
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box style={{ flexShrink: 0 }}>
                <Title
                  order={1}
                  mb="xs"
                  style={{
                    color:
                      "light-dark(var(--mantine-color-primary-8), var(--mantine-color-primary-2))",
                  }}
                >
                  CSV Data Upload & Generate MRF Files
                </Title>
                <Text c="dimmed">
                  Upload a CSV file, edit the data in an interactive grid, and
                  generate MRF files
                </Text>
              </Box>

              <Card withBorder style={{ flexShrink: 0 }}>
                <Stepper active={csvStore.currentStep} size="lg">
                  {steps.map((step, index) => (
                    <Stepper.Step
                      key={index}
                      label={step.label}
                      description={step.description}
                      icon={step.icon}
                    />
                  ))}
                  <Stepper.Completed>
                    Completed, click back button to get to previous step
                  </Stepper.Completed>
                </Stepper>
              </Card>

              <Card
                withBorder
                p="lg"
                style={{
                  flex: isReviewStep ? 1 : "0 0 auto",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: isReviewStep ? "hidden" : "visible",
                }}
              >
                <Box
                  style={{
                    flex: isReviewStep ? 1 : "0 0 auto",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: isReviewStep ? "hidden" : "visible",
                  }}
                >
                  {csvStore.currentStep === 0 && <UploadCSV />}
                  {csvStore.currentStep === 1 && <ReviewCSV />}
                  {csvStore.currentStep === 2 && <GenerateMRF />}
                </Box>
              </Card>
            </Stack>
          </div>
        </div>
      </Sidebar>
    );
  },
);

export default CSVStepper;
