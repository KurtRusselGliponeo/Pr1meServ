const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'Client Reassignment System',
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_URL || '/api/v1'),
};
