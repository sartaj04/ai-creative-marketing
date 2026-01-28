export const siteConfig = {
  name: 'Pixo AI',
  tagline: 'Agentic Personal Branding Platform',
  description:
    'Transform manual personal branding into a 5-minute daily review workflow. Pixo\'s AI agents learn your voice, find opportunities, and deliver ready content daily.',
  url: 'https://pixo.ai',
  locale: 'en_US',
  twitter: {
    handle: '@pixoai',
    site: '@pixoai',
    cardType: 'summary_large_image' as const,
  },
  creator: 'Pixo',
  keywords: [
    'personal branding software',
    'personal brand management platform',
    'LinkedIn branding tools',
    'professional branding platform',
    'content automation for professionals',
    'AI personal branding',
    'personal branding for founders',
    'executive personal branding',
    'consultant personal branding',
    'team branding platform',
  ],
  authors: [{ name: 'Pixo', url: 'https://pixo.ai' }],
  ogImage: '/og-default.png',
  twitterImage: '/twitter-card.png',
  themeColor: '#0891B2',
  links: {
    twitter: 'https://twitter.com/pixoai',
    linkedin: 'https://linkedin.com/company/pixoai',
  },
};

export type SiteConfig = typeof siteConfig;
