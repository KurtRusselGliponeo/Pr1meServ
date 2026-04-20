import axios from 'axios';
import { toast } from 'sonner';

import { refreshAccessToken } from '@/features/identity/services/auth.service';
import {
  clearAuthSession,
  getAccessToken,
  getStoredAuthUser,
  persistAuthSession,
} from '@/lib/auth';
import { getErrorMessage } from '@/lib/error-utils';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeToRefresh(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

function notifyRefreshSubscribers(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const nextAccessToken = await refreshAccessToken();
          const storedUser = getStoredAuthUser();

          if (storedUser) {
            persistAuthSession({
              accessToken: nextAccessToken,
              user: storedUser,
            });
          }

          notifyRefreshSubscribers(nextAccessToken);
        } catch (refreshError) {
          notifyRefreshSubscribers(null);
          clearAuthSession();

          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        subscribeToRefresh((token) => {
          if (!token) {
            reject(error);
            return;
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }

          resolve(api(originalRequest));
        });
      });
    }

    if (typeof window !== 'undefined' && error.response?.status && error.response.status >= 400) {
      toast.error(getErrorMessage(error));
    }

    return Promise.reject(error);
  },
);

export default api;
