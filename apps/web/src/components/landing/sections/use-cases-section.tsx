'use client';

import Link from 'next/link';
import { User, Building2, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '../scroll-reveal';
import { SectionHeader } from './section-header';

const personalBrands = [
  {
    title: 'Founders',
    desc: 'Build authority while you build your company. We prepare, you approve.',
    slug: 'founders',
  },
  {
    title: 'Executives',
    desc: 'Maintain executive presence without becoming a content creator.',
    slug: 'executives',
  },
  {
    title: 'Consultants',
    desc: 'Stay visible in your industry without the daily grind.',
    slug: 'consultants',
  },
];

const enterpriseBrands = [
  {
    title: 'SaaS Companies',
    desc: 'Thought leadership at scale. ICP-aware positioning.',
    slug: 'teams',
  },
  {
    title: 'Agencies',
    desc: 'Manage multiple brand voices from one platform.',
    slug: 'teams',
  },
  {
    title: 'B2B Teams',
    desc: 'Unified brand presence across your entire team.',
    slug: 'teams',
  },
];

export function UseCasesSection() {
  return (
    <section className="py-28 px-6 md:px-12 lg:px-16 bg-white">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label="Use Cases"
          title="Built for personal brands and enterprises"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Personal Brands */}
          <ScrollReveal delay={0.1}>
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center">
                  <User className="w-7 h-7 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
                    Personal Brands
                  </h3>
                  <p className="text-slate-500">Founders, Executives, Consultants</p>
                </div>
              </div>
              <div className="space-y-4">
                {personalBrands.map((item, i) => (
                  <Link
                    key={i}
                    href={`/use-cases/${item.slug}`}
                    className="group block p-5 rounded-xl border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1 tracking-tight">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Enterprise Brands */}
          <ScrollReveal delay={0.2}>
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
                    Enterprise Brands
                  </h3>
                  <p className="text-slate-500">SaaS, Agencies, B2B Teams</p>
                </div>
              </div>
              <div className="space-y-4">
                {enterpriseBrands.map((item, i) => (
                  <Link
                    key={i}
                    href={`/use-cases/${item.slug}`}
                    className="group block p-5 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1 tracking-tight">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
