'use client';

import { FileText, Repeat, Brain } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../scroll-reveal';
import { SectionHeader } from './section-header';

const problems = [
  {
    icon: FileText,
    title: 'Blank page syndrome',
    desc: 'You open the app and stare. What should I post today? The creative pressure is exhausting.',
  },
  {
    icon: Repeat,
    title: 'Tool overload',
    desc: 'Search viral posts, pick templates, generate, edit, schedule — repeat every single day.',
  },
  {
    icon: Brain,
    title: 'Starts from scratch daily',
    desc: "Your tools don't remember your voice or what topics worked. You re-explain yourself every time.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-28 px-6 md:px-12 lg:px-16 bg-white">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label="The Problem"
          title="The busywork draining your creative energy"
          description="You have a vision. These are the things getting in the way."
        />

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          staggerDelay={0.1}
        >
          {problems.map((item, i) => (
            <StaggerItem key={i}>
              <div className="group p-8 rounded-2xl border border-slate-200 bg-white hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-900/5 transition-all duration-300">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-7 group-hover:bg-cyan-50 group-hover:scale-105 transition-all duration-300">
                  <item.icon className="w-7 h-7 text-slate-500 group-hover:text-cyan-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
