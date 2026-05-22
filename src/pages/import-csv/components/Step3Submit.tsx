// import React, { useCallback } from 'react';
// import { observer } from 'mobx-react-lite';
// import {
//   Stack,
//   Button,
//   Group,
//   Box,
//   Text,
//   Progress,
//   Alert,
//   Code,
//   CopyButton,
//   Loader,
// } from '@mantine/core';
// import { IconAlertCircle, IconCheck, IconCopy } from '@tabler/icons-react';
// import { csvStore } from "../../../stores/csvStore.ts";
// // import { convertToCSV } from '../papaParseService';
// // import { uploadCSVToS3 } from '../s3Service';

// /**
//  * Step 3: Upload to S3 with Progress Tracking
//  * Converts edited CSV data to CSV format and uploads to S3 via multipart upload
//  * Shows progress bar and displays final S3 URL on completion
//  */

// const Step3Submit: React.FC = observer(() => {
//   const handleUploadToS3 = useCallback(async () => {
//     try {
//       csvStore.setIsLoading(true);
//       csvStore.setUploadError(null);
//       csvStore.setUploadProgress(0);

//       // Convert CSV data back to CSV format
//       const csvContent = ""
//       // convertToCSV(
//       //   csvStore.csvData,
//       //   csvStore.csvHeaders
//       // );

//       // Generate file name with timestamp
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//       const fileName = `upload_${timestamp}.csv`;

//       // Upload to S3 with progress tracking
//       const s3Url =
//       ""
//       //  await uploadCSVToS3(
//       //   csvContent,
//       //   fileName,
//       //   (progress) => {
//       //     csvStore.setUploadProgress(progress.percentage);
//       //   }
//       // );

//       // Store final S3 URL
//       csvStore.setS3Url(s3Url);
//       csvStore.setIsLoading(false);
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error ? error.message : 'Unknown error occurred';
//       csvStore.setUploadError(errorMessage);
//       csvStore.setIsLoading(false);
//       csvStore.setUploadProgress(0);
//     }
//   }, []);

//   const handleBackToEdit = () => {
//     csvStore.previousStep();
//   };

//   const handleReset = () => {
//     csvStore.resetStore();
//   };

//   return (
//     <Stack gap="lg">
//       {!csvStore.s3Url ? (
//         <>
//           {/* Upload Section */}
//           <Box>
//             <Text fw={600} mb="xs">
//               Upload CSV to S3
//             </Text>
//             <Text size="sm" c="dimmed" mb="md">
//               Your edited CSV data will be uploaded to AWS S3 using multipart
//               upload for optimal performance and reliability.
//             </Text>
//           </Box>

//           {/* Error Display */}
//           {csvStore.uploadError && (
//             <Alert
//               icon={<IconAlertCircle size={16} />}
//               title="Upload Failed"
//               color="red"
//             >
//               {csvStore.uploadError}
//             </Alert>
//           )}

//           {/* Progress Section */}
//           {csvStore.isLoading && (
//             <Box>
//               <Group justify="space-between" mb="xs">
//                 <Text size="sm" fw={500}>
//                   Uploading to S3...
//                 </Text>
//                 <Text size="sm" fw={500} c="blue">
//                   {csvStore.uploadProgress}%
//                 </Text>
//               </Group>
//               <Progress
//                 value={csvStore.uploadProgress}
//                 animated
//                 color="blue"
//               />
//               <Group justify="center" mt="md">
//                 <Loader size="sm" />
//                 <Text size="sm" c="dimmed">
//                   Processing {csvStore.rowCount} rows...
//                 </Text>
//               </Group>
//             </Box>
//           )}

//           {/* Upload Summary */}
//           {!csvStore.isLoading && (
//             <Box
//               p="md"
//               style={{
//                 backgroundColor: '#f8f9fa',
//                 borderRadius: '8px',
//                 border: '1px solid #dee2e6',
//               }}
//             >
//               <Group justify="space-between" mb="xs">
//                 <Text fw={500}>Upload Summary</Text>
//               </Group>
//               <Group gap="md">
//                 <Box>
//                   <Text size="sm" c="dimmed">
//                     Total Rows:
//                   </Text>
//                   <Text fw={600}>{csvStore.rowCount}</Text>
//                 </Box>
//                 <Box>
//                   <Text size="sm" c="dimmed">
//                     Total Columns:
//                   </Text>
//                   <Text fw={600}>{csvStore.csvHeaders.length}</Text>
//                 </Box>
//                 <Box>
//                   <Text size="sm" c="dimmed">
//                     Changes Made:
//                   </Text>
//                   <Text fw={600}>
//                     {csvStore.hasChanges ? 'Yes' : 'No'}
//                   </Text>
//                 </Box>
//               </Group>
//             </Box>
//           )}

//           {/* Action Buttons */}
//           <Group justify="space-between">
//             <Button
//               variant="outline"
//               onClick={handleBackToEdit}
//               disabled={csvStore.isLoading}
//             >
//               Back to Edit
//             </Button>
//             <Button
//               onClick={handleUploadToS3}
//               disabled={csvStore.isLoading || csvStore.rowCount === 0}
//               loading={csvStore.isLoading}
//             >
//               Upload to S3
//             </Button>
//           </Group>
//         </>
//       ) : (
//         <>
//           {/* Success Section */}
//           <Alert
//             icon={<IconCheck size={16} />}
//             title="Upload Complete"
//             color="green"
//           >
//             Your CSV has been successfully uploaded to S3!
//           </Alert>

//           {/* S3 URL Display */}
//           <Box>
//             <Text fw={600} mb="xs">
//               S3 Upload URL
//             </Text>
//             <Group gap="xs">
//               <Code
//                 p="sm"
//                 style={{
//                   flex: 1,
//                   overflow: 'auto',
//                   wordBreak: 'break-all',
//                 }}
//               >
//                 {csvStore.s3Url}
//               </Code>
//               <CopyButton value={csvStore.s3Url || ''}>
//                 {({ copied }) => (
//                   <Button
//                     variant={copied ? 'light' : 'default'}
//                     size="sm"
//                     leftSection={<IconCopy size={14} />}
//                   >
//                     {copied ? 'Copied' : 'Copy'}
//                   </Button>
//                 )}
//               </CopyButton>
//             </Group>

//             <Text size="sm" c="dimmed" mt="md">
//               This URL can be shared with your backend API to process the uploaded
//               file. The URL is valid for 24 hours.
//             </Text>
//           </Box>

//           {/* Upload Details */}
//           <Box
//             p="md"
//             style={{
//               backgroundColor: '#f0f9ff',
//               borderRadius: '8px',
//               border: '1px solid #bae6fd',
//             }}
//           >
//             <Group justify="space-between">
//               <Box>
//                 <Text size="sm" c="dimmed">
//                   Rows Uploaded:
//                 </Text>
//                 <Text fw={600}>{csvStore.rowCount}</Text>
//               </Box>
//               <Box>
//                 <Text size="sm" c="dimmed">
//                   Columns:
//                 </Text>
//                 <Text fw={600}>{csvStore.csvHeaders.length}</Text>
//               </Box>
//               <Box>
//                 <Text size="sm" c="dimmed">
//                   Status:
//                 </Text>
//                 <Text fw={600} c="green">
//                   Completed
//                 </Text>
//               </Box>
//             </Group>
//           </Box>

//           {/* Next Steps Info */}
//           <Box
//             p="md"
//             style={{
//               backgroundColor: '#f5f5f5',
//               borderRadius: '8px',
//               border: '1px solid #d0d0d0',
//             }}
//           >
//             <Text fw={500} size="sm" mb="xs">
//               Next Steps:
//             </Text>
//             <Stack gap="xs">
//               <Text size="sm">1. Share the S3 URL with your backend API</Text>
//               <Text size="sm">2. Backend will process the file</Text>
//               <Text size="sm">3. Download or access processed results</Text>
//             </Stack>
//           </Box>

//           {/* Action Buttons */}
//           <Group justify="flex-end">
//             <Button variant="outline" onClick={handleReset}>
//               Upload Another File
//             </Button>
//           </Group>
//         </>
//       )}
//     </Stack>
//   );
// });

// export default Step3Submit;
