'use client';

import Link from 'next/link';
import { Brain, Inbox, Sparkles, Target, Calendar, BarChart3, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StaggerContainer, StaggerItem } from '../scroll-reveal';
import { SectionHeader } from './section-header';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Inbox,
  Sparkles,
  Target,
  Calendar,
  BarChart3,
};

const features = [
  {
    icon: 'Brain',
    title: 'Voice Profile',
    desc: 'Connects to your LinkedIn, website, and past content. Understands your tone and expertise automatically.',
    highlight: true,
  },
  {
    icon: 'Inbox',
    title: 'Ready Drafts',
    desc: 'Open the app and drafts are waiting. No blank page. No "what should I post?"',
    highlight: false,
  },
  {
    icon: 'Sparkles',
    title: 'Swipe to Approve',
    desc: 'Swipe right to approve, left to reject, up to edit. Your vision, refined — never from scratch.',
    highlight: false,
  },
  {
    icon: 'Target',
    title: 'Trend Detection',
    desc: 'Finds trending topics and hooks relevant to your expertise. Stay current without constant monitoring.',
    highlight: false,
  },
  {
    icon: 'Calendar',
    title: 'Auto Scheduling',
    desc: 'Approved content publishes at optimal times. Set it and forget it.',
    highlight: false,
  },
  {
    icon: 'BarChart3',
    title: 'Improves Over Time',
    desc: 'Your approvals and rejections improve future drafts. The more you use it, the better it gets.',
    highlight: false,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-6 md:px-12 lg:px-16 bg-white">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label="Features"
          title="Everything you need to post consistently"
          description="AI prepares the content. You just review and approve."
        />

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          staggerDelay={0.08}
        >
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <StaggerItem key={i}>
                <Card
                  className={`p-7 border rounded-2xl ${feature.highlight
                      ? 'border-cyan-200 bg-gradient-to-br from-cyan-50/80 to-white shadow-lg shadow-cyan-900/5'
                      : 'border-slate-100 bg-white hover:border-cyan-100 hover:shadow-lg hover:shadow-slate-900/5'
                    } transition-all duration-300`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${feature.highlight ? 'bg-cyan-100' : 'bg-slate-100'
                      }`}
                  >
                    <Icon
                      className={`w-7 h-7 ${feature.highlight ? 'text-cyan-600' : 'text-slate-500'
                        }`}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <div className="mt-12 text-center">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
          >
            Learn more about all features
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
