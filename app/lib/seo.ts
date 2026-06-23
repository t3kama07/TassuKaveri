export const DEFAULT_SITE_URL = 'https://tassukaveri.fi';

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return configuredUrl.replace(/\/+$/, '');
}

export function absoluteUrl(path: string = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export const publicSitemapRoutes = [
  { path: '/', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/about.html', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/faq.html', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/blog.html', priority: 0.8, changeFrequency: 'weekly' as const },
  {
    path: '/blog/lemmikinhoito-oulussa.html',
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  },
  {
    path: '/blog/ilmainen-lemmikinhoito.html',
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  },
  {
    path: '/blog/kuka-hoitaa-lemmikin-lomalla.html',
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  },
  {
    path: '/blog/ei-loydy-lemmikinhoitajaa.html',
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  },
  { path: '/privacy-policy.html', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms-of-service.html', priority: 0.3, changeFrequency: 'yearly' as const },
];
