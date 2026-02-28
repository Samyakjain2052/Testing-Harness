import apiClient from './client';

export interface RecordingSession {
  sessionId: string;
  appId: string;
  targetUrl: string;
  status: 'recording' | 'completed' | 'failed' | 'error';
  error?: string;
  startedAt: string;
}

export const recordingsApi = {
  start: async (appId: string, body: { target_url: string; name: string }) => {
    const { data } = await apiClient.post(`/applications/${appId}/recordings/start`, body);
    return data.data as RecordingSession;
  },

  getStatus: async (sessionId: string) => {
    const { data } = await apiClient.get(`/recordings/${sessionId}/status`);
    return data.data as RecordingSession;
  },

  stop: async (sessionId: string) => {
    const { data } = await apiClient.post(`/recordings/${sessionId}/stop`);
    return data.data as RecordingSession;
  },

  save: async (sessionId: string, body: { name: string; description?: string; tags?: string[] }) => {
    const { data } = await apiClient.post(`/recordings/${sessionId}/save`, body);
    return data.data;
  },
};
