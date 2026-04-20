declare module '@sentry/node' {
  const Sentry: any;
  export default Sentry;
}

declare module '@sentry/profiling-node' {
  export const nodeProfilingIntegration: (...args: any[]) => any;
}
