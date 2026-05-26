# Clearest Health Frontend

A React + TypeScript admin console for uploading large CSV datasets, reviewing/editing them efficiently, and generating MRF artifacts through authenticated backend workflows.

## Tech Stack

- React 19 + TypeScript + Vite
- Mantine UI for components/theme
- MobX (`mobx`, `mobx-react-lite`) for app/workflow state
- AG Grid Enterprise for high-performance data grids
- Dexie + IndexedDB for local large-row storage
- AWS Amplify Auth (Cognito hosted UI, Google social login)

## Core Features

- Cognito-authenticated access to protected pages
- 3-step CSV workflow:
  - Upload CSV and stream parse in chunks
  - Review/edit/delete rows in AG Grid (infinite row model)
  - Generate and upload MRF payload via presigned S3 upload
- Jobs/MRF list page with status and links
- Public read-only MRF JSON preview by job id
- Light/dark theme toggle persisted in local storage

## Project Structure

- `src/main.tsx`: App bootstrap + Amplify configuration
- `src/App.tsx`: Providers, global theme, routing, route guards
- `src/stores/csvStore.ts`: MobX store for CSV workflow metadata/state
- `src/services/indexdbService.ts`: IndexedDB read/write/query/mutation layer
- `src/services/api/jobsApi.ts`: Jobs API client functions
- `src/utils/authFetch.ts`: Authenticated fetch helper (Bearer token)
- `src/pages/generate-csv/*`: Upload, review, and generate MRF flow
- `src/pages/mrf-files/MRFFilesPage.tsx`: Jobs table
- `src/pages/public-mrf-file-view/PublicMRFFileViewPage.tsx`: Public MRF viewer
- `src/pages/auth/*`: Login and route guard
- `src/components/common/Sidebar.tsx`: Shared app shell/navigation

## Environment Variables

Configured in `.env` (see `.env.example` for sample keys):

- `VITE_AWS_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`
- `VITE_API_BASE_URL`
- `VITE_MANTINE_LICENSE_KEY`

## Local Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Routing Summary

- `/login`: Authentication page
- `/`: Protected CSV stepper workflow
- `/mrf-files`: Protected jobs/MRF listing
- `/public/mrf-file-view/:jobId`: Public MRF JSON preview

## Data Flow (High Level)

1. User signs in through Cognito hosted UI.
2. CSV is parsed in chunks and written directly to IndexedDB (not kept in full memory).
3. Review grid fetches only visible slices from IndexedDB and supports edit/delete.
4. Final submission exports normalized rows, requests presigned upload URL, uploads JSON to S3.
5. Jobs page retrieves processing status and output file links from backend.

For full architecture and component-level details, see [DESIGN.md](./DESIGN.md).