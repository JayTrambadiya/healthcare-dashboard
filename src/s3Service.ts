// /**
//  * S3 Service - Handles multipart upload to S3
//  * Manages signed URLs, chunk uploads, and progress tracking
//  */

// export interface S3UploadConfig {
//   bucket: string;
//   key: string;
//   contentType: string;
//   // This would come from backend via API
//   signedUrls?: string[];
//   uploadId?: string;
// }

// export interface UploadProgress {
//   totalChunks: number;
//   uploadedChunks: number;
//   percentage: number;
//   currentChunk: number;
// }

// /**
//  * Get signed URLs from backend for multipart upload
//  * @param fileName - Name of file to upload
//  * @param fileSize - Size of file in bytes
//  * @param contentType - MIME type of file
//  * @returns Promise with upload config including signed URLs
//  */
// export const initiateMultipartUpload = async (
//   fileName: string,
//   fileSize: number,
//   contentType: string
// ): Promise<S3UploadConfig> => {
//   try {
//     const response = await fetch('/api/s3/initiate-upload', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         fileName,
//         fileSize,
//         contentType,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to initiate S3 upload');
//     }

//     return await response.json();
//   } catch (error) {
//     throw new Error(`Multipart upload initiation failed: ${error}`);
//   }
// };

// /**
//  * Upload CSV data to S3 via multipart upload
//  * @param csvContent - CSV data as string
//  * @param fileName - S3 file name
//  * @param onProgress - Progress callback
//  * @returns Promise with S3 URL
//  */
// export const uploadCSVToS3 = async (
//   csvContent: string,
//   fileName: string,
//   onProgress?: (progress: UploadProgress) => void
// ): Promise<string> => {
//   try {
//     const contentType = 'text/csv;charset=utf-8';

//     // Get upload config from backend
//     const uploadConfig = await initiateMultipartUpload(
//       fileName,
//       new Blob([csvContent]).size,
//       contentType
//     );

//     // If single-part upload (small file), use simple PUT
//     if (uploadConfig.signedUrls && uploadConfig.signedUrls.length === 1) {
//       const response = await fetch(uploadConfig.signedUrls[0], {
//         method: 'PUT',
//         headers: {
//           'Content-Type': contentType,
//         },
//         body: csvContent,
//       });

//       if (!response.ok) {
//         throw new Error('S3 upload failed');
//       }

//       // Extract S3 URL from response or return from signed URL
//       const s3Url = uploadConfig.signedUrls[0].split('?')[0];

//       if (onProgress) {
//         onProgress({
//           totalChunks: 1,
//           uploadedChunks: 1,
//           percentage: 100,
//           currentChunk: 1,
//         });
//       }

//       return s3Url;
//     }

//     // Multipart upload for larger files
//     return await multipartUploadToS3(
//       csvContent,
//       uploadConfig,
//       fileName,
//       onProgress
//     );
//   } catch (error) {
//     throw new Error(`CSV upload to S3 failed: ${error}`);
//   }
// };

// /**
//  * Handle multipart upload to S3
//  * @param csvContent - CSV data
//  * @param uploadConfig - Config with signed URLs and upload ID
//  * @param fileName - File name
//  * @param onProgress - Progress callback
//  * @returns Promise with final S3 URL
//  */
// const multipartUploadToS3 = async (
//   csvContent: string,
//   uploadConfig: S3UploadConfig,
//   fileName: string,
//   onProgress?: (progress: UploadProgress) => void
// ): Promise<string> => {
//   const chunkSize = 5 * 1024 * 1024; // 5MB chunks
//   const csvBlob = new Blob([csvContent]);
//   const chunks: Blob[] = [];

//   // Split content into chunks
//   let offset = 0;
//   while (offset < csvBlob.size) {
//     chunks.push(csvBlob.slice(offset, offset + chunkSize));
//     offset += chunkSize;
//   }

//   const uploadedParts: Array<{ partNumber: number; etag: string }> = [];

//   // Upload each chunk
//   for (let i = 0; i < chunks.length; i++) {
//     const chunk = chunks[i];
//     const signedUrl = uploadConfig.signedUrls?.[i];

//     if (!signedUrl) {
//       throw new Error(`No signed URL for chunk ${i + 1}`);
//     }

//     const response = await fetch(signedUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'text/csv;charset=utf-8',
//       },
//       body: chunk,
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to upload chunk ${i + 1}`);
//     }

//     // Extract ETag from response headers
//     const etag = response.headers.get('etag') || `etag-${i + 1}`;
//     uploadedParts.push({
//       partNumber: i + 1,
//       etag,
//     });

//     // Update progress
//     if (onProgress) {
//       onProgress({
//         totalChunks: chunks.length,
//         uploadedChunks: i + 1,
//         percentage: Math.round(((i + 1) / chunks.length) * 100),
//         currentChunk: i + 1,
//       });
//     }
//   }

//   // Complete multipart upload
//   const completeResponse = await fetch('/api/s3/complete-upload', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       uploadId: uploadConfig.uploadId,
//       parts: uploadedParts,
//       fileName,
//     }),
//   });

//   if (!completeResponse.ok) {
//     throw new Error('Failed to complete S3 upload');
//   }

//   const result = await completeResponse.json();
//   return result.s3Url || `s3://${uploadConfig.bucket}/${uploadConfig.key}`;
// };

// /**
//  * Abort multipart upload (cleanup on error)
//  * @param uploadId - Upload ID from initiation
//  */
// export const abortMultipartUpload = async (uploadId: string): Promise<void> => {
//   try {
//     await fetch('/api/s3/abort-upload', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ uploadId }),
//     });
//   } catch (error) {
//     console.error('Failed to abort upload:', error);
//   }
// };
