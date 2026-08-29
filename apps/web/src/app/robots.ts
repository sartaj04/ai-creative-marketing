import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard/',
        '/auth/',
        '/onboarding/',
        '/inbox/',
        '/drafts/',
        '/templates/',
        '/analytics/',
        '/settings/',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
