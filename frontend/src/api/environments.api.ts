import apiClient from './client';

export interface Environment {
  id: string;
  app_id: string;
  name: string;
  base_url: string;
  is_active: boolean;
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export const environmentsApi = {
  listByApp: async (appId: string) => {
    const { data } = await apiClient.get(`/applications/${appId}/environments`);
    return data.data as Environment[];
  },

  create: async (appId: string, body: { name: string; base_url: string; variables?: Record<string, string> }) => {
    const { data } = await apiClient.post(`/applications/${appId}/environments`, body);
    return data.data as Environment;
  },

  update: async (id: string, body: { name?: string; base_url?: string; is_active?: boolean; variables?: Record<string, string> }) => {
    const { data } = await apiClient.put(`/environments/${id}`, body);
    return data.data as Environment;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/environments/${id}`);
  },
};
