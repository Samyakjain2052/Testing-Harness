import apiClient from './client';

export interface TestScript {
  id: string;
  app_id: string;
  name: string;
  description: string | null;
  blob_path: string;
  file_size_bytes: number | null;
  tags: string[];
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const testScriptsApi = {
  listByApp: async (appId: string, params?: { page?: number; limit?: number; search?: string; tags?: string }) => {
    const { data } = await apiClient.get(`/applications/${appId}/scripts`, { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/scripts/${id}`);
    return data.data as TestScript;
  },

  getContent: async (id: string) => {
    const { data } = await apiClient.get(`/scripts/${id}/content`, {
      responseType: 'text',
      headers: { Accept: 'text/typescript' },
    });
    return data as string;
  },

  upload: async (appId: string, file: File, metadata: { name: string; description?: string; tags?: string[] }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const { data } = await apiClient.post(`/applications/${appId}/scripts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data as TestScript;
  },

  update: async (id: string, body: { name?: string; description?: string; tags?: string[] }) => {
    const { data } = await apiClient.put(`/scripts/${id}`, body);
    return data.data as TestScript;
  },

  archive: async (id: string) => {
    await apiClient.delete(`/scripts/${id}`);
  },
};
