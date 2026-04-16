import axios from 'axios';

export type ApiFieldErrors = Record<string, string[] | undefined>;

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          error?: string;
        }
      | undefined;

    return data?.message ?? data?.error ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getFieldErrors(error: unknown): ApiFieldErrors {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const data = error.response?.data as
    | {
        errors?: ApiFieldErrors;
      }
    | undefined;

  return data?.errors ?? {};
}
