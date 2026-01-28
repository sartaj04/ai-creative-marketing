export interface Feature {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  longDescription: string;
  icon: string;
  benefits: string[];
  highlight?: boolean;
}

export const features: Feature[] = [
  {
    id: 'identity-graph',
    title: 'Unified Identity Graph',
    shortTitle: 'Identity Graph',
    description:
      'Learns from your LinkedIn, website, resume, and history — automatically. No manual setup.',
    longDescription:
      'The Identity Graph is the foundation of Pixo. It continuously learns from your existing content, professional history, and online presence to understand your unique voice, expertise, and positioning. Unlike other tools that require manual style guides, Pixo builds this understanding automatically.',
    icon: 'Brain',
    benefits: [
      'Automatic voice learning from existing content',
      'Understands your expertise and positioning',
      'Continuously improves with every interaction',
      'No manual style setup required',
    ],
    highlight: true,
  },
  {
    id: 'agent-inbox',
    title: 'Agent Inbox',
    shortTitle: 'Inbox',
    description:
      'Open the app and ready drafts are waiting. No blank page. No "what should I post?"',
    longDescription:
      'Every day, you open Pixo to find fresh, ready-to-publish drafts waiting for you. Our AI agents work around the clock to prepare content that matches your voice and captures relevant opportunities. Say goodbye to blank page syndrome.',
    icon: 'Inbox',
    benefits: [
      'Wake up to ready drafts daily',
      'No creative block or blank pages',
      'Content prepared while you sleep',
      'Focus on review, not creation',
    ],
    highlight: false,
  },
  {
    id: 'swipe-review',
    title: 'Swipe to Approve',
    shortTitle: 'Swipe Review',
    description:
      'Swipe right to approve, left to reject, up to edit. Every swipe trains the agent.',
    longDescription:
      'The fastest way to manage content. Swipe through drafts like reviewing photos. Right to approve, left to reject, up to edit. Every interaction teaches the AI more about your preferences, making future drafts even better.',
    icon: 'Sparkles',
    benefits: [
      'Review 20+ drafts in under 10 minutes',
      'Intuitive swipe interface',
      'Every action improves AI learning',
      'Quick edits without friction',
    ],
    highlight: false,
  },
  {
    id: 'opportunity-scout',
    title: 'Opportunity Scout',
    shortTitle: 'Opportunity Scout',
    description:
      'Agents find trending hooks and opportunities relevant to YOUR brand. Proactively.',
    longDescription:
      'Stay ahead of the conversation without constant monitoring. Opportunity Scout scans trending topics, industry news, and viral content to find hooks that align with your expertise. You get draft ideas that capitalize on what\'s happening now.',
    icon: 'Target',
    benefits: [
      'Automatic trend detection',
      'Industry-relevant opportunities',
      'Timely content suggestions',
      'Stay relevant without monitoring',
    ],
    highlight: false,
  },
  {
    id: 'smart-scheduler',
    title: 'Smart Scheduler',
    shortTitle: 'Scheduler',
    description: 'Auto-publish at optimal times. Your calendar is agent-managed.',
    longDescription:
      'Timing matters. Smart Scheduler analyzes your audience engagement patterns to determine the best times to post. Once you approve content, it\'s automatically queued for optimal delivery. Set it and forget it.',
    icon: 'Calendar',
    benefits: [
      'AI-optimized posting times',
      'Automatic queue management',
      'Consistent publishing cadence',
      'No manual scheduling needed',
    ],
    highlight: false,
  },
  {
    id: 'learning-loop',
    title: 'Learning Loop',
    shortTitle: 'Analytics',
    description:
      'Every approval and rejection makes agents smarter. They adapt to you over time.',
    longDescription:
      'Pixo gets better the more you use it. The Learning Loop analyzes which content performs best, which drafts you approve, and how you edit suggestions. This feedback continuously refines the AI to match your preferences.',
    icon: 'BarChart3',
    benefits: [
      'Performance-based learning',
      'Preference adaptation',
      'Continuous improvement',
      'Personalized over time',
    ],
    highlight: false,
  },
];

export function getFeatureById(id: string): Feature | undefined {
  return features.find((f) => f.id === id);
}

export function getHighlightedFeature(): Feature | undefined {
  return features.find((f) => f.highlight);
}
