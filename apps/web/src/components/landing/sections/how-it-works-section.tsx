'use client';

import { User, Zap, Inbox, Rocket } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../scroll-reveal';
import { SectionHeader } from './section-header';

const steps = [
  {
    step: '01',
    title: 'Connect your accounts',
    desc: 'Link your LinkedIn and website. Pixo analyzes your content to understand your voice.',
    icon: User,
  },
  {
    step: '02',
    title: 'AI prepares drafts',
    desc: 'Based on your voice and trending topics, Pixo generates content drafts for you.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Review and approve',
    desc: 'Open the app and drafts are ready. Swipe right to approve, left to reject.',
    icon: Inbox,
  },
  {
    step: '04',
    title: 'Auto-publish',
    desc: 'Approved content is scheduled and posted at optimal times automatically.',
    icon: Rocket,
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-28 px-6 md:px-12 lg:px-16 bg-slate-900 text-white relative overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        <SectionHeader
          label="How Pixo Works"
          title="You refine. We prepare. Here's how."
          description="Your creative energy belongs on strategy and refinement — not starting from scratch."
          dark
        />

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          staggerDelay={0.1}
        >
          {steps.map((item, i) => (
            <StaggerItem key={i}>
              <div className="relative group">
                {i !== 3 && (
                  <div className="hidden lg:block absolute top-14 left-full w-full h-[1px] bg-gradient-to-r from-slate-700 to-transparent z-0" />
                )}
                <div className="relative z-10 p-7 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/80 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-sm font-bold text-cyan-400 tracking-wide">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
