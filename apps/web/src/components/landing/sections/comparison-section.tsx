'use client';

import { Clock, Zap, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollReveal } from '../scroll-reveal';
import { SectionHeader } from './section-header';

const manualTools = [
  'You open app: "What should I post?"',
  'Search through viral posts manually',
  'Pick templates, generate, edit',
  'Paste writing samples for style',
  'You do everything yourself',
];

const pixoFeatures = [
  'You open app: "Here\'s what I prepared"',
  'Proactive delivery of relevant hooks',
  'Review, swipe, approve',
  'Zero-touch auto-learning',
  'You refine what we prepare',
];

const comparisonTable = [
  {
    capability: 'Your role',
    manual: 'Do everything',
    pixo: 'Refine and approve',
  },
  {
    capability: 'Content creation',
    manual: 'You create everything',
    pixo: 'Agents prepare, you review',
  },
  {
    capability: 'Voice learning',
    manual: 'Manual style input',
    pixo: 'Automatic from your content',
  },
  {
    capability: 'Opportunity discovery',
    manual: 'Manual search',
    pixo: 'Proactive agent scanning',
  },
  {
    capability: 'Publishing',
    manual: 'Manual scheduling',
    pixo: 'Smart auto-scheduling',
  },
  {
    capability: 'Improvement',
    manual: 'Starts from scratch',
    pixo: 'Learns from every interaction',
  },
];

export function ComparisonSection() {
  return (
    <section className="py-28 px-6 md:px-12 lg:px-16 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="The Difference"
          title="Manual-first vs Agent-first"
          description="Pixo fundamentally changes how brand presence works."
        />

        {/* Card Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <ScrollReveal delay={0.1}>
            <Card className="p-8 border-slate-200 bg-white/70 rounded-2xl h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 tracking-tight">
                    Manual-First Tools
                  </h3>
                  <p className="text-sm text-slate-400">Supergrow, Buffer, etc.</p>
                </div>
              </div>
              <ul className="space-y-5">
                {manualTools.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Card className="p-8 border-cyan-200 bg-white shadow-xl rounded-2xl relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-50 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 tracking-tight">
                      Agent-First Platform
                    </h3>
                    <p className="text-sm text-cyan-600 font-medium">Pixo</p>
                  </div>
                </div>
                <ul className="space-y-5">
                  {pixoFeatures.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 text-slate-700 font-medium"
                    >
                      <Check className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </ScrollReveal>
        </div>

        {/* Detailed Comparison Table */}
        <ScrollReveal delay={0.3}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-4 font-semibold text-slate-900">Capability</div>
              <div className="p-4 font-semibold text-slate-500 text-center">
                Manual Tools
              </div>
              <div className="p-4 font-semibold text-cyan-600 text-center">Pixo</div>
            </div>
            {comparisonTable.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 ${
                  i !== comparisonTable.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="p-4 text-slate-700 font-medium">{row.capability}</div>
                <div className="p-4 text-slate-400 text-center text-sm">
                  {row.manual}
                </div>
                <div className="p-4 text-slate-900 text-center text-sm font-medium bg-cyan-50/30">
                  {row.pixo}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
