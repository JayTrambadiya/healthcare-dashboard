import authFetch from "../../utils/authFetch.ts";
import { API_BASE_URL } from "../../constants.ts";

export type JobRecord = {
  userId: string;
  jobId: string;
  createdAt: string;
  isMrfFileReady: boolean;
  mrfFileUrl: string;
  presignedUrl?: string;
  s3Key?: string;
  status: string;
  updatedAt: string;
};

type JobsListResponse = {
  jobs: JobRecord[];
  count: number;
  nextToken: string | null;
};

const DEFAULT_LIMIT = 50;

export async function fetchAllJobs(publicFlag = false): Promise<JobRecord[]> {
  const all: JobRecord[] = [];
  let nextToken: string | null = null;

  do {
    const qs = new URLSearchParams({
      limit: String(DEFAULT_LIMIT),
      public: String(publicFlag),
    });

    if (nextToken) {
      qs.set("nextToken", nextToken);
    }

    const response = await authFetch(API_BASE_URL + `/jobs?${qs.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status}`);
    }

    const data = (await response.json()) as JobsListResponse;
    all.push(...(data.jobs ?? []));
    nextToken = data.nextToken;
  } while (nextToken);

  return all;
}

export async function fetchJobById(
  jobId: string,
  publicFlag = true,
): Promise<JobRecord> {
  const qs = new URLSearchParams({ public: String(publicFlag) });
  const response = await authFetch(
    API_BASE_URL + `/jobs/${encodeURIComponent(jobId)}?${qs.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch job: ${response.status}`);
  }

  return (await response.json()) as JobRecord;
}

export async function fetchPublicJsonFromUrl(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch public MRF JSON: ${response.status}`);
  }

  return response.json();
}
