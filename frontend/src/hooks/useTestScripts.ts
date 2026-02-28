import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testScriptsApi } from '../api/test-scripts.api';

export function useTestScripts(appId: string, params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['test-scripts', appId, params],
    queryFn: () => testScriptsApi.listByApp(appId, params),
    enabled: !!appId,
  });
}

export function useTestScript(id: string) {
  return useQuery({
    queryKey: ['test-script', id],
    queryFn: () => testScriptsApi.getById(id),
    enabled: !!id,
  });
}

export function useTestScriptContent(id: string) {
  return useQuery({
    queryKey: ['test-script-content', id],
    queryFn: () => testScriptsApi.getContent(id),
    enabled: !!id,
  });
}

export function useUploadScript(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: { name: string; description?: string; tags?: string[] } }) =>
      testScriptsApi.upload(appId, file, metadata),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-scripts', appId] }),
  });
}
