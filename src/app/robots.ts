import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dev/', '/sentry-example-page/', '/monitoring/'],
      },
      // ChatGPT search — allow discovery
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dev/'],
      },
      // Perplexity — allow discovery
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dev/'],
      },
      // Block AI training crawlers (opt out of training, not search)
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'Google-Extended',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
