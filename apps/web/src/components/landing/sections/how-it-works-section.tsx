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
      className="py-28 px-6 md:px-12 lg:px-16 bg-slate-50 relative overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-cyan-100/40 rounded-full blur-[100px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto relative">
        <SectionHeader
          label="How Pixo Works"
          title="You refine. We prepare. Here's how."
          description="Your creative energy belongs on strategy and refinement — not starting from scratch."
        />

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          staggerDelay={0.1}
        >
          {steps.map((item, i) => (
            <StaggerItem key={i}>
              <div className="relative group">
                {i !== 3 && (
                  <div className="hidden lg:block absolute top-14 left-full w-full h-[1px] bg-gradient-to-r from-slate-200 to-transparent z-0" />
                )}
                <div className="relative z-10 p-7 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-900/5 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-cyan-600" />
                    </div>
                    <span className="text-sm font-bold text-cyan-600 tracking-wide">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
