'use client';

import { motion } from 'framer-motion';
import { ScrollReveal } from '../scroll-reveal';
import { platformStats } from '@/data/social-proof';

export function SocialProofSection() {
  return (
    <section className="py-12 px-6 md:px-12 lg:px-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Trusted by text */}
            <div className="flex items-center gap-4 shrink-0">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Trusted by professionals at
              </p>
            </div>

            {/* Logo placeholders - using text-based logos for now */}
            <div className="flex items-center gap-8 md:gap-12 flex-wrap justify-center">
              {['Fortune 500', 'YC Startups', 'Top Agencies', 'Enterprise'].map(
                (name, i) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-slate-300 font-semibold text-sm tracking-wide"
                  >
                    {name}
                  </motion.div>
                )
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export function StatsSection() {
  return (
    <section className="py-16 px-6 md:px-12 lg:px-16 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {platformStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                {stat.description && (
                  <div className="text-xs text-slate-400 mt-1">{stat.description}</div>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
