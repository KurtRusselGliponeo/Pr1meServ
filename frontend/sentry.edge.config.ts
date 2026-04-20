export {};

async function initSentry() {
  try {
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === 'production',
      tracesSampleRate: 0.05,
      environment: process.env.NODE_ENV,
    });
  } catch {
    // Sentry is optional until the package is installed.
  }
}

void initSentry();
