import type { MetadataRoute } from 'next';
import { absoluteUrl, getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/dashboard',
          '/dev-tools',
          '/exchange',
          '/messages',
          '/notifications',
          '/pets',
          '/profile',
          '/requests',
          '/sitters',
          '/verify-email',
          '/api',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  };
}
