import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pinpoint: the world map, made playable',
    short_name: 'Pinpoint',
    description: 'Every flag on one map, sourced country facts, and geography games solo or with friends.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3ece4',
    theme_color: '#f3ece4',
    orientation: 'any',
    categories: ['education', 'games'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: 'Daily Mix', url: '/play/daily' },
      { name: 'Guess the Flag', url: '/play/guess-flag' },
      { name: 'Explore', url: '/explore' },
      { name: 'Party Rooms', url: '/party' },
    ],
  };
}
