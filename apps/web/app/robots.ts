import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/serverData';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/party/', '/styleguide'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
