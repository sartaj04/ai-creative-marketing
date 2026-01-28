import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo/config';

// Use case slugs for generating sitemap
const useCaseSlugs = ['founders', 'executives', 'consultants', 'teams'];

// Blog post slugs - will be replaced with actual MDX file discovery later
const blogSlugs = [
  'building-personal-brand-without-posting-daily',
  'personal-branding-vs-personal-presence',
  'why-personal-branding-tools-fail-consistency',
  'founders-building-authority-not-influencers',
  'executive-personal-branding-guide',
  'content-to-reputation-evolution',
  'personal-branding-at-scale-teams',
  'hidden-cost-inconsistent-presence',
  'linkedin-algorithm-personal-brands',
  'measuring-personal-brand-roi',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // Core pages
  const corePages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];

  // Use case pages
  const useCasePages: MetadataRoute.Sitemap = useCaseSlugs.map((slug) => ({
    url: `${baseUrl}/use-cases/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...corePages, ...useCasePages, ...blogPages];
}
