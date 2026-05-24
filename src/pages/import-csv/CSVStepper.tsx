import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";
import {
  Container,
  Stack,
  Stepper,
  Box,
  Title,
  Text,
  Card,
  // Button,
  // Group,
} from "@mantine/core";
import { IconUpload, IconTable, IconCloud } from "@tabler/icons-react";
// import { csvStore } from "../../stores/csvStore";
import UploadCSV from "./components/UploadCSV";
// import Step1Upload from './components/Step1Upload';
// import Step2EditGrid from './components/Step2EditGrid';
// import Step3Submit from './components/Step3Submit';
import { csvStore } from "../../stores/csvStore.ts";
import ReviewCSV from "./components/ReviewCSV.tsx";

/**
 * CSV Upload Stepper Component
 * Orchestrates the 3-step workflow:
 * 1. Upload & validate CSV with Papa Parse
 * 2. Edit data in AG Grid
 * 3. Upload to S3 with progress tracking
 */

const CSVStepper: React.FC = observer(() => {
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
      // Cleanup on unmount
      csvStore.resetStore();
    };
  }, []);

  console.log("Current Step:", csvStore.currentStep);

  return (
      <Container
          size="xl"
          py="xl"
          h="100vh"
          style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <Stack
            gap="lg"
            h="100%"
            style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {/* Header */}
          <Box mb="lg" style={{ flexShrink: 0 }}>
            <Title order={1} mb="xs">
              CSV Data Upload & Processing
            </Title>
            <Text c="dimmed">
              Upload a CSV file, edit the data in an interactive grid, and submit
              to AWS S3
            </Text>
          </Box>

          {/* Stepper */}
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

          {/* Content */}
          <Card
              withBorder
              p="lg"
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
          >
            {/* {csvStore.currentStep === 0 && <Step1Upload />}
          {csvStore.currentStep === 1 && <Step2EditGrid />}
          {csvStore.currentStep === 2 && <Step3Submit />} */}
            <Box
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
            >
              {csvStore.currentStep === 0 && <UploadCSV />}
              {csvStore.currentStep === 1 && <ReviewCSV />}
              {csvStore.currentStep === 2 && <div>step 3</div>}
            </Box>
          </Card>
          {/* <Group justify="center" mt="xl">
          <Button
            variant="default"
            onClick={() => {
              console.log(csvStore.currentStep);
              csvStore.previousStep();
            }}
            className=""
          >
            Back
          </Button>
          <Button
            onClick={() => {
              console.log(csvStore.currentStep);
              csvStore.nextStep();
            }}
            className=""
          >
            Next step
          </Button>
        </Group> */}
        </Stack>
      </Container>
  );
});

export default CSVStepper;
