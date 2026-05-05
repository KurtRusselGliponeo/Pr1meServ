'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return null;
}
