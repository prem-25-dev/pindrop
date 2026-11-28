import fs from 'node:fs';
import path from 'node:path';
import type { CountryIndexItem } from './countries';

/** the published country data, read on the server (for pages built ahead of time) */
let cache: CountryIndexItem[] | null = null;
export function serverCountries(): CountryIndexItem[] {
  if (cache) return cache;
  const root = path.join(process.cwd(), 'public', 'data');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')) as { version: string };
  cache = JSON.parse(fs.readFileSync(path.join(root, version, 'countries.json'), 'utf8')) as CountryIndexItem[];
  return cache;
}

/** the public site address, for canonical links and the sitemap */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
