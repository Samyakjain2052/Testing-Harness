import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testExecutionsApi } from '../api/test-executions.api';

export function useTestExecution(id: string) {
  return useQuery({
    queryKey: ['execution', id],
    queryFn: () => testExecutionsApi.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'queued' || status === 'running') return 3000;
      return false;
    },
  });
}

export function useExecutionResults(executionId: string, isRunning = false) {
  return useQuery({
    queryKey: ['execution-results', executionId],
    queryFn: () => testExecutionsApi.getResults(executionId),
    enabled: !!executionId,
    refetchInterval: isRunning ? 3000 : false,
  });
}

export function useExecutionLogs(executionId: string, type: 'stdout' | 'stderr', enabled = false) {
  return useQuery({
    queryKey: ['execution-logs', executionId, type],
    queryFn: () => testExecutionsApi.getLogs(executionId, type),
    enabled: !!executionId && enabled,
    staleTime: Infinity,
    retry: false,
  });
}

export function useCancelExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testExecutionsApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['execution', id] });
    },
  });
}

export function useTriggerExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scriptId, environmentId, options }: {
      scriptId: string;
      environmentId: string;
      options?: Record<string, unknown>;
    }) => testExecutionsApi.trigger(scriptId, { environment_id: environmentId, options }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useAppExecutions(appId: string, params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['executions', 'app', appId, params],
    queryFn: () => testExecutionsApi.listByApp(appId, params),
    enabled: !!appId,
  });
}

export function useScriptExecutions(scriptId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['executions', 'script', scriptId, params],
    queryFn: () => testExecutionsApi.listByScript(scriptId, params),
    enabled: !!scriptId,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => testExecutionsApi.getDashboardStats(),
  });
}
