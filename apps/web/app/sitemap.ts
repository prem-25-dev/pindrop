import type { MetadataRoute } from 'next';
import { SITE_URL, serverCountries } from '@/lib/serverData';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/explore', '/play', '/party', '/leaderboard', '/play/guess-flag', '/play/pin-drop', '/play/find-region', '/play/silhouette', '/play/border-hop', '/play/daily'];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...serverCountries().map((c) => ({ url: `${SITE_URL}/country/${c.slug}`, changeFrequency: 'monthly' as const, priority: c.un195 ? 0.6 : 0.4 })),
  ];
}
