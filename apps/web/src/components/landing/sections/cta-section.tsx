'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '../scroll-reveal';

export function CTASection() {
  return (
    <section className="py-28 px-6 md:px-12 lg:px-16 bg-white">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-12 md:p-20 text-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-[-0.02em] leading-tight mb-6">
                Stop spending hours on content
              </h2>
              <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                Let AI prepare your LinkedIn posts. You just review and approve.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth?mode=signup">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-base font-semibold bg-cyan-500 hover:bg-cyan-400 text-white shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/40 rounded-xl"
                  >
                    Start Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
              <p className="text-slate-500 text-sm mt-8 tracking-tight">
                No credit card required
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
