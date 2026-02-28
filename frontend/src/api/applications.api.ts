import apiClient from './client';

export interface Application {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export const applicationsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get('/applications', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/applications/${id}`);
    return data.data as Application;
  },

  create: async (body: { name: string; description?: string }) => {
    const { data } = await apiClient.post('/applications', body);
    return data.data as Application;
  },

  update: async (id: string, body: { name?: string; description?: string }) => {
    const { data } = await apiClient.put(`/applications/${id}`, body);
    return data.data as Application;
  },

  archive: async (id: string) => {
    await apiClient.delete(`/applications/${id}`);
  },
};
