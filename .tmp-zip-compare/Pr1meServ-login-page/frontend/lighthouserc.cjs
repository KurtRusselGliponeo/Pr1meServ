module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx next start -p 3005',
      url: [
        'http://127.0.0.1:3005/dashboard',
        'http://127.0.0.1:3005/dashboard/performance'
      ],
      puppeteerScript: './tests/phase-6/performance/lighthouse-auth.cjs',
      numberOfRuns: 1,
      settings: {
        preset: 'desktop', // We want to test the desktop dashboard
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
