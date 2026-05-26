# Application Design Documentation

## 1. Overview

This application is a frontend admin console for Clearest Health that supports an end-to-end MRF generation workflow:

1. Authenticate user with AWS Cognito.
2. Upload large CSV files.
3. Stream and persist CSV data into browser IndexedDB.
4. Review/edit data through AG Grid without loading full dataset into memory.
5. Submit normalized JSON to backend-driven S3 upload flow.
6. Track generated MRF jobs and open public MRF previews.

The architecture is optimized for large file handling and responsive UI by splitting responsibilities across:

- UI layer (React + Mantine)
- Workflow state layer (MobX)
- Local data persistence layer (Dexie/IndexedDB)
- Backend API integration layer (authenticated fetch + service modules)

## 2. Overall Application Flow

### 2.1 Startup Flow

- `src/main.tsx`
  - Configures Amplify Auth using environment-driven Cognito values.
  - Enables OAuth redirect paths:
    - sign-in callback: `/auth/callback` (configured, although no explicit route component currently exists)
    - sign-out callback: `/auth/logout` (configured, route currently falls through wildcard)
  - Mounts the React app.

- `src/App.tsx`
  - Registers AG Grid Enterprise modules.
  - Configures Mantine provider and Notifications provider.
  - Provides Amplify `Authenticator.Provider` context.
  - Initializes router and route tree.
  - Maintains and persists theme mode (`light`/`dark`) in local storage.

### 2.2 Auth + Navigation Flow

- Public route: `/login` renders Amplify `Authenticator` UI.
- Protected routes (`/`, `/mrf-files`) are wrapped by `ProtectedRoute`.
- `ProtectedRoute` checks Amplify `authStatus`:
  - `configuring`: shows loader
  - unauthenticated: redirects to `/login`
  - authenticated: renders children

### 2.3 CSV-to-MRF Workflow (Home Route `/`)

The home route renders `CSVStepper`, a 3-step process controlled by MobX `csvStore.currentStep`:

1. **Upload CSV (`UploadCSV`)**
2. **Review & Edit (`ReviewCSV`)**
3. **Generate MRF (`GenerateMRF`)**

Unmounting the stepper triggers `csvStore.resetStore()` to clear transient workflow state.

## 3. Component Responsibilities

## 3.1 App Shell and Routing Components

- `App.tsx`
  - Root provider composition
  - Route definitions
  - Theme toggling + persisted mode
  - Global logout action

- `components/common/Sidebar.tsx`
  - Shared protected-layout shell
  - Left navigation links:
    - Home (`/`)
    - MRF Files (`/mrf-files`)
  - Header actions:
    - Theme toggle
    - Logout

- `pages/auth/LoginPage.tsx`
  - Renders Cognito-hosted authentication UI
  - Redirects authenticated users to `/`

- `pages/auth/ProtectedRoute.tsx`
  - Route guard for private pages

## 3.2 CSV Workflow Components

- `pages/generate-csv/CSVStepper.tsx`
  - Owns high-level step flow
  - Renders step header + step-specific component

- `UploadCSV.tsx`
  - Validates selected file type (`.csv`)
  - Resets existing IndexedDB state for new upload
  - Streams CSV parsing in 512KB chunks via PapaParse worker
  - Writes each chunk directly to IndexedDB
  - Stores only metadata in MobX:
    - headers
    - inferred column types
    - row counts
    - parse/loading status

- `ReviewCSV.tsx`
  - AG Grid Infinite Row Model datasource backed by IndexedDB query API
  - Supports:
    - infinite scrolling
    - filtering and sorting
    - inline cell editing (persisted back to IndexedDB)
    - row deletion with confirmation modal
  - Uses `csvStore.gridKey` refresh pattern to force datasource remount after mutations

- `GenerateMRF.tsx`
  - Exports all rows from IndexedDB
  - Normalizes row payload by removing internal `rowIndex`
  - Requests presigned upload metadata from backend endpoint `/upload/presign`
  - Uploads JSON payload to returned S3 URL
  - Updates progress and error/success status in MobX
  - Redirects to `/mrf-files` after successful submission

## 3.3 MRF Listing and Public View Components

- `MRFFilesPage.tsx`
  - Fetches all jobs through paginated API helper
  - Displays jobs in AG Grid
  - Shows status badges and MRF URL links
  - Links to public view route for each job

- `PublicMRFFileViewPage.tsx`
  - Loads job details by `jobId`
  - Fetches MRF JSON from public file URL
  - Renders tabular JSON preview in AG Grid when shape is table-compatible

## 4. State Management with MobX

State is centralized in `src/stores/csvStore.ts` as `CsvStoreClass` instance (`csvStore`).

## 4.1 MobX Store Role

The store keeps workflow and UI metadata, not raw full CSV rows.

Primary state domains:

- File/parse state:
  - `csvFile`, `csvHeaders`, `columnTypes`, `parseError`, `isLoading`
- Data presence state:
  - `totalRows`, `isDbReady`, `gridKey`
- Stepper state:
  - `currentStep`
- Submission state:
  - `uploadProgress`, `uploadError`, `s3Url`, `isGenerating`

## 4.2 Actions and Computed Values

Actions provide explicit state transitions (e.g., `setCSVFile`, `setTotalRows`, `nextStep`, `resetStore`, etc.).

Computed values:

- `rowCount`: derived from `totalRows`
- `hasData`: `isDbReady && totalRows > 0`

`observer` wrappers in step components ensure UI auto-re-renders when observable values change.

## 5. Local Data Persistence (IndexedDB)

`src/services/indexdbService.ts` implements all row-level persistence/query behavior using Dexie.

## 5.1 Data Model

- Database name: unique per tab session (`csv_upload_db_<timestamp>_<random>`)
- Store: `csv_rows`
- Primary key: `rowIndex` (auto-increment)

## 5.2 Why IndexedDB Here

Large CSV datasets are written incrementally and read in windows, which avoids holding full datasets in React/MobX memory.

## 5.3 Query and Mutation APIs

- `insertChunk(rows)` for upload chunk ingestion
- `queryRows({startRow,endRow,filterModel,sortModel})` for AG Grid datasource
- `updateRow(rowIndex, updates)` for cell edits
- `deleteRow(rowIndex)` for row removal
- `exportAllRows(callback)` for final submission payload assembly
- `resetDatabase()` for clean upload restarts

## 6. Backend API Interaction

## 6.1 Authenticated HTTP Layer

`src/utils/authFetch.ts`:

- Gets access token from Amplify `fetchAuthSession()`
- Adds `Authorization: Bearer <token>` when available
- Sets default `Content-Type: application/json`

This wrapper is used by API modules and submission flow.

## 6.2 Jobs API Module

`src/services/api/jobsApi.ts` exposes:

- `fetchAllJobs(publicFlag = false)`
  - Paginates through `/jobs` using `nextToken`
- `fetchJobById(jobId, publicFlag = true)`
  - Calls `/jobs/:jobId`
- `fetchPublicJsonFromUrl(url)`
  - Plain public fetch for the MRF file URL

## 6.3 MRF Generation API Flow

From `GenerateMRF.tsx`:

1. Export all rows from IndexedDB.
2. `POST {API_BASE_URL}/upload/presign` with `fileName` and content type.
3. Receive `{ presignedUrl, s3Key }`.
4. `PUT` JSON payload to presigned URL.
5. Save resulting URL in state and navigate to jobs page.

## 7. Routing and Navigation

Configured in `App.tsx` with `BrowserRouter` + `Routes`:

- `/login`
  - Public login route.

- `/public/mrf-file-view/:jobId`
  - Public read-only job/MRF preview route.

- `/`
  - Protected route.
  - Renders CSV stepper workflow.

- `/mrf-files`
  - Protected route.
  - Renders jobs/MRF listing.

- `*`
  - Fallback redirect to `/`.

Navigation UX:

- Protected pages share `Sidebar` with explicit route links.
- Theme and logout actions available globally in protected header.

## 8. Configuration and Environment

Environment variables are defined in `src/constants.ts` via `import.meta.env`:

- `VITE_AWS_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`
- `VITE_API_BASE_URL`
- `VITE_MANTINE_LICENSE_KEY`

These values configure authentication and backend API base URL.

## 9. Architectural Summary

The application uses a layered architecture designed for large CSV handling and responsive interaction:

- **UI/Route layer** controls user flow and visualization.
- **MobX layer** controls workflow state and progress.
- **IndexedDB layer** stores and queries row data at scale.
- **API layer** handles authenticated backend communication.

This separation keeps rendering performant, makes side effects explicit, and supports predictable multi-step workflow transitions from upload through MRF generation.