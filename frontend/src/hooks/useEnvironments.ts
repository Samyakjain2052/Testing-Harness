import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { environmentsApi } from '../api/environments.api';

export function useEnvironments(appId: string) {
  return useQuery({
    queryKey: ['environments', appId],
    queryFn: () => environmentsApi.listByApp(appId),
    enabled: !!appId,
  });
}

export function useCreateEnvironment(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; base_url: string; variables?: Record<string, string> }) =>
      environmentsApi.create(appId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['environments', appId] }),
  });
}

export function useDeleteEnvironment(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => environmentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['environments', appId] }),
  });
}
