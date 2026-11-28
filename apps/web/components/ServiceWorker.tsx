'use client';
import { useEffect } from 'react';

/** registers the offline service worker in production builds only (it would fight hot reload in development) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* not supported here (private window, http): the site still works online */
    });
  }, []);
  return null;
}
