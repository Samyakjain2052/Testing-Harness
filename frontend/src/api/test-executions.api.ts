import apiClient from './client';

export type ExecutionStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'cancelled';

export interface TestExecution {
  id: string;
  script_id: string;
  environment_id: string;
  status: ExecutionStatus;
  queue_job_id: string | null;
  triggered_by: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  retry_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DetailedTestExecution extends TestExecution {
  script_name: string;
  script_description: string | null;
  script_tags: string[];
  app_id: string;
  environment_name: string;
  environment_base_url: string;
}

export interface TestResult {
  id: string;
  execution_id: string;
  step_number: number;
  step_name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration_ms: number | null;
  screenshot_blob_path: string | null;
  error_details: string | null;
  expected_value: string | null;
  actual_value: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalApps: number;
  totalScripts: number;
  totalExecutions: number;
  passRate: number;
  recentExecutions: number;
}

export const testExecutionsApi = {
  trigger: async (scriptId: string, body: { environment_id: string; options?: Record<string, unknown> }) => {
    const { data } = await apiClient.post(`/scripts/${scriptId}/execute`, body);
    return data.data as TestExecution;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/executions/${id}`);
    return data.data as DetailedTestExecution;
  },

  getLogs: async (id: string, type: 'stdout' | 'stderr') => {
    const { data } = await apiClient.get(`/executions/${id}/logs`, { params: { type } });
    return data.data as { content: string; type: string };
  },

  getScreenshotUrl: (blobPath: string) =>
    `/api/v1/executions/screenshot?path=${encodeURIComponent(blobPath)}`,

  getResults: async (id: string) => {
    const { data } = await apiClient.get(`/executions/${id}/results`);
    return data.data as TestResult[];
  },

  cancel: async (id: string) => {
    const { data } = await apiClient.post(`/executions/${id}/cancel`);
    return data.data as TestExecution;
  },

  listByApp: async (appId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const { data } = await apiClient.get(`/applications/${appId}/executions`, { params });
    return data;
  },

  listByScript: async (scriptId: string, params?: { page?: number; limit?: number }) => {
    const { data } = await apiClient.get(`/scripts/${scriptId}/executions`, { params });
    return data;
  },

  getDashboardStats: async () => {
    const { data } = await apiClient.get('/dashboard/stats');
    return data.data as DashboardStats;
  },
};
