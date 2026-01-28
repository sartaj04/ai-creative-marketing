import { LucideIcon, Clock, Target, TrendingUp, Users, Brain, Sparkles, Calendar, BarChart3, Shield, Zap } from 'lucide-react';

export interface Problem {
  title: string;
  description: string;
  icon: string;
}

export interface Solution {
  title: string;
  description: string;
  feature: string;
  featureSlug: string;
}

export interface UseCase {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  problems: Problem[];
  solutions: Solution[];
  stats: Array<{ value: string; label: string }>;
  cta: {
    title: string;
    subtitle: string;
  };
}

export const useCases: UseCase[] = [
  {
    slug: 'founders',
    title: 'Pixo for Founders',
    metaTitle: 'Personal Branding for Startup Founders',
    metaDescription:
      'Build authority while building your company. Pixo\'s AI agents prepare content so founders can maintain brand presence in just 5 minutes daily.',
    heroTitle: 'Build your brand while you build your company',
    heroSubtitle: 'Personal Branding for Founders',
    heroDescription:
      'Founders don\'t have time for daily content creation. Between fundraising, product, and team - personal branding falls to the bottom. Pixo\'s agents work in the background so you can focus on what matters.',
    problems: [
      {
        title: 'No time for content',
        description:
          'Between fundraising, product development, and team management, personal branding is the first thing to drop.',
        icon: 'Clock',
      },
      {
        title: 'Inconsistent presence',
        description:
          'You post for a week, then disappear for a month. Your audience never knows when to expect you.',
        icon: 'Target',
      },
      {
        title: 'Generic AI content',
        description:
          'AI tools produce content that sounds nothing like you. Your unique founder perspective gets lost.',
        icon: 'Brain',
      },
    ],
    solutions: [
      {
        title: '5-minute daily workflow',
        description:
          'Wake up to ready drafts. Review and approve between meetings. Agents handle the creative heavy lifting.',
        feature: 'Agent Inbox',
        featureSlug: 'agent-inbox',
      },
      {
        title: 'Your voice, automatically',
        description:
          'Pixo learns from your LinkedIn, website, and past content. Every draft sounds authentically you.',
        feature: 'Identity Graph',
        featureSlug: 'identity-graph',
      },
      {
        title: 'Thought leadership on autopilot',
        description:
          'Opportunity Scout finds trending topics in your space. Stay relevant without constant monitoring.',
        feature: 'Opportunity Scout',
        featureSlug: 'opportunity-scout',
      },
    ],
    stats: [
      { value: '5 min', label: 'Daily review time' },
      { value: '10+', label: 'Drafts per week' },
      { value: 'Auto', label: 'Scheduling' },
    ],
    cta: {
      title: 'Try it free',
      subtitle: 'No credit card required.',
    },
  },
  {
    slug: 'executives',
    title: 'Pixo for Executives',
    metaTitle: 'Executive Personal Branding Platform',
    metaDescription:
      'Build executive presence without becoming a full-time content creator. Pixo helps C-suite leaders maintain professional visibility in 5 minutes daily.',
    heroTitle: 'Executive presence without the content grind',
    heroSubtitle: 'Personal Branding for Executives',
    heroDescription:
      'C-suite leaders need professional visibility, but can\'t spend hours on social media. Pixo delivers polished, executive-appropriate content that builds authority.',
    problems: [
      {
        title: 'Time constraints',
        description:
          'Your calendar is packed with meetings, strategy sessions, and stakeholder calls. Content creation isn\'t a priority.',
        icon: 'Clock',
      },
      {
        title: 'Tone sensitivity',
        description:
          'Executive content needs to be polished and appropriate. One wrong post can become a PR issue.',
        icon: 'Shield',
      },
      {
        title: 'Delegation challenges',
        description:
          'Handing content to marketing loses your authentic voice. Ghost-written posts feel inauthentic.',
        icon: 'Users',
      },
    ],
    solutions: [
      {
        title: 'Executive-appropriate drafts',
        description:
          'Pixo learns your professional tone. Drafts are polished, appropriate, and ready for C-suite visibility.',
        feature: 'Identity Graph',
        featureSlug: 'identity-graph',
      },
      {
        title: 'Review and approve workflow',
        description:
          'Swipe through drafts in minutes. Full control over what gets published, zero content creation.',
        feature: 'Swipe Review',
        featureSlug: 'swipe-review',
      },
      {
        title: 'Strategic scheduling',
        description:
          'Smart Scheduler posts at optimal times for executive audiences. Consistent presence, no daily effort.',
        feature: 'Smart Scheduler',
        featureSlug: 'smart-scheduler',
      },
    ],
    stats: [
      { value: '5 min', label: 'Daily review time' },
      { value: '100%', label: 'Your approval' },
      { value: 'Auto', label: 'Scheduling' },
    ],
    cta: {
      title: 'Try it free',
      subtitle: 'No credit card required.',
    },
  },
  {
    slug: 'consultants',
    title: 'Pixo for Consultants',
    metaTitle: 'Personal Branding for Consultants & Advisors',
    metaDescription:
      'Build the visibility that wins clients. Pixo helps consultants and advisors maintain consistent thought leadership without the daily content grind.',
    heroTitle: 'The visibility that wins clients',
    heroSubtitle: 'Personal Branding for Consultants',
    heroDescription:
      'Consultants live and die by their reputation. But when you\'re busy with client work, personal branding slips. Pixo keeps your thought leadership consistent.',
    problems: [
      {
        title: 'Feast or famine visibility',
        description:
          'When you\'re busy with clients, you disappear from social. When you need clients, you scramble to rebuild presence.',
        icon: 'TrendingUp',
      },
      {
        title: 'Expertise not showcased',
        description:
          'You have deep expertise but struggle to communicate it consistently. Your knowledge stays hidden.',
        icon: 'Brain',
      },
      {
        title: 'Manual effort fatigue',
        description:
          'Writing thought leadership content daily is exhausting. Eventually, you give up.',
        icon: 'Zap',
      },
    ],
    solutions: [
      {
        title: 'Always-on thought leadership',
        description:
          'Pixo generates insights from your expertise. Consistent presence even when you\'re deep in client work.',
        feature: 'Agent Inbox',
        featureSlug: 'agent-inbox',
      },
      {
        title: 'Expertise amplification',
        description:
          'Opportunity Scout finds trending topics in your niche. Position yourself as the go-to expert.',
        feature: 'Opportunity Scout',
        featureSlug: 'opportunity-scout',
      },
      {
        title: 'Performance insights',
        description:
          'Analytics show what resonates with your audience. Double down on content that attracts ideal clients.',
        feature: 'Analytics',
        featureSlug: 'analytics',
      },
    ],
    stats: [
      { value: '5 min', label: 'Daily review time' },
      { value: 'Daily', label: 'Fresh drafts' },
      { value: 'Auto', label: 'Publishing' },
    ],
    cta: {
      title: 'Try it free',
      subtitle: 'No credit card required.',
    },
  },
  {
    slug: 'teams',
    title: 'Pixo for Teams',
    metaTitle: 'Team Personal Branding Platform',
    metaDescription:
      'Scale personal branding across your entire organization. Pixo helps teams build unified professional presence with approval workflows and brand consistency.',
    heroTitle: 'Personal branding at organizational scale',
    heroSubtitle: 'Team Branding Platform',
    heroDescription:
      'Modern companies know that employee personal brands drive business results. But managing this at scale is nearly impossible - until now.',
    problems: [
      {
        title: 'Inconsistent brand voice',
        description:
          'Different team members post in wildly different styles. There\'s no unified professional presence.',
        icon: 'Users',
      },
      {
        title: 'No visibility into activity',
        description:
          'Marketing has no idea what employees are posting. Compliance concerns go unaddressed.',
        icon: 'BarChart3',
      },
      {
        title: 'Adoption challenges',
        description:
          'You\'ve tried employee advocacy tools. Nobody uses them because they require too much effort.',
        icon: 'Target',
      },
    ],
    solutions: [
      {
        title: 'Unified brand identity',
        description:
          'Set brand guidelines once. Every team member gets on-brand drafts that still sound like them.',
        feature: 'Identity Graph',
        featureSlug: 'identity-graph',
      },
      {
        title: 'Approval workflows',
        description:
          'Marketing reviews before publish. Full control over what goes out, without bottlenecking creativity.',
        feature: 'Team Collaboration',
        featureSlug: 'team-collaboration',
      },
      {
        title: 'Team analytics',
        description:
          'See performance across your entire team. Identify top performers and content that resonates.',
        feature: 'Analytics',
        featureSlug: 'analytics',
      },
    ],
    stats: [
      { value: '5 min', label: 'Per member daily' },
      { value: '1', label: 'Dashboard' },
      { value: 'Unified', label: 'Brand voice' },
    ],
    cta: {
      title: 'Get in touch',
      subtitle: 'Team pricing available.',
    },
  },
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return useCases.find((uc) => uc.slug === slug);
}

export function getAllUseCaseSlugs(): string[] {
  return useCases.map((uc) => uc.slug);
}
