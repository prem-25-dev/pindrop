import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { ServiceWorker } from '@/components/ServiceWorker';
import { Shell } from '@/components/Shell';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap', weight: ['400', '600', '700', '800', '900'] });

export const metadata: Metadata = {
  title: { default: 'Pinpoint — the world map, made playable', template: '%s · Pinpoint' },
  description: 'Explore every country on a map of flags with sourced facts, and play geography games solo or with friends.',
  applicationName: 'Pinpoint',
  appleWebApp: { capable: true, title: 'Pinpoint', statusBarStyle: 'default' },
  icons: { icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3ece4' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1a26' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
        <ServiceWorker />
      </body>
    </html>
  );
}
