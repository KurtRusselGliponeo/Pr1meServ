import axios from 'axios';

// Global Axios instance pointing to the Fastify backend
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send HTTP-only cookies for auth
});

// Request interceptor — attach JWT bearer token if present
api.interceptors.request.use(
  (config) => {
    // Token will be read from a context/store in real implementation
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle global 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login page on token expiry
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
