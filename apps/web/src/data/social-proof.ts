export interface Logo {
  name: string;
  src: string;
  alt: string;
}

export interface Stat {
  value: string;
  label: string;
  description?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  image?: string;
  initials: string;
}

export interface TrustBadge {
  name: string;
  icon: string;
  description: string;
}

// Company logos for social proof bar
// Note: These are placeholder paths - actual logos would need to be added
export const companyLogos: Logo[] = [
  { name: 'YCombinator', src: '/logos/yc.svg', alt: 'Y Combinator' },
  { name: 'Techstars', src: '/logos/techstars.svg', alt: 'Techstars' },
  { name: 'ProductHunt', src: '/logos/producthunt.svg', alt: 'Product Hunt' },
  { name: 'Forbes', src: '/logos/forbes.svg', alt: 'Forbes' },
  { name: 'TechCrunch', src: '/logos/techcrunch.svg', alt: 'TechCrunch' },
];

// Key metrics for stats bar
export const platformStats: Stat[] = [
  {
    value: '10K+',
    label: 'Active Users',
    description: 'Professionals using Pixo daily',
  },
  {
    value: '2M+',
    label: 'Drafts Generated',
    description: 'AI-prepared content pieces',
  },
  {
    value: '5 min',
    label: 'Daily Average',
    description: 'Time to review and approve',
  },
  {
    value: '4.8',
    label: 'User Rating',
    description: 'Average satisfaction score',
  },
];

// Featured testimonials for landing page
export const featuredTestimonials: Testimonial[] = [
  {
    quote:
      'I went from spending an hour every morning on content to just reviewing what Pixo prepared. Game changer for a busy founder.',
    author: 'Sarah Chen',
    role: 'Founder & CEO',
    company: 'TechStartup',
    initials: 'SC',
  },
  {
    quote:
      'The swipe interface is genius. My team reviews 20+ drafts in under 10 minutes. Our LinkedIn presence has never been more consistent.',
    author: 'Marcus Johnson',
    role: 'Head of Marketing',
    company: 'SaaS Co',
    initials: 'MJ',
  },
  {
    quote:
      "Finally, an AI tool that actually learns my voice. After a week, the drafts sound like me — not like generic AI slop.",
    author: 'Alex Rivera',
    role: 'Creator & Consultant',
    company: 'Independent',
    initials: 'AR',
  },
  {
    quote:
      'We rolled out Pixo to our entire sales team. Within a month, 80% were actively posting. Our brand visibility skyrocketed.',
    author: 'Jennifer Walsh',
    role: 'VP Sales',
    company: 'Enterprise Corp',
    initials: 'JW',
  },
  {
    quote:
      'As a CFO, I need my content to be polished and professional. Pixo gets my tone exactly right.',
    author: 'Michael Torres',
    role: 'CFO',
    company: 'Finance Inc',
    initials: 'MT',
  },
  {
    quote:
      'My inbound leads doubled after 3 months of consistent posting. Pixo made it possible without adding hours to my week.',
    author: 'David Park',
    role: 'Management Consultant',
    company: 'Independent',
    initials: 'DP',
  },
];

// Trust and security badges for enterprise section
export const trustBadges: TrustBadge[] = [
  {
    name: 'SOC 2 Ready',
    icon: 'Shield',
    description: 'Enterprise-grade security controls',
  },
  {
    name: 'GDPR Compliant',
    icon: 'Lock',
    description: 'Full data privacy compliance',
  },
  {
    name: 'SSO Support',
    icon: 'Key',
    description: 'Single sign-on integration',
  },
  {
    name: '99.9% Uptime',
    icon: 'Server',
    description: 'Enterprise reliability SLA',
  },
];

// Integration logos for enterprise section
export const integrationLogos: Logo[] = [
  { name: 'Slack', src: '/logos/slack.svg', alt: 'Slack' },
  { name: 'Salesforce', src: '/logos/salesforce.svg', alt: 'Salesforce' },
  { name: 'HubSpot', src: '/logos/hubspot.svg', alt: 'HubSpot' },
  { name: 'Zapier', src: '/logos/zapier.svg', alt: 'Zapier' },
  { name: 'LinkedIn', src: '/logos/linkedin.svg', alt: 'LinkedIn' },
];
