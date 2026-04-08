import { http } from '../../../lib/http';

export type SystemStatus = {
  status: string;
  message: string;
  timestamp: string;
};

export type SystemMeta = {
  appName: string;
  environment: string;
  apiVersion: string;
  supabaseConfigured: boolean;
};

export const getSystemHealth = async () => {
  const { data } = await http.get<SystemStatus>('/health');
  return data;
};

export const getSystemMeta = async () => {
  const { data } = await http.get<SystemMeta>('/meta');
  return data;
};
