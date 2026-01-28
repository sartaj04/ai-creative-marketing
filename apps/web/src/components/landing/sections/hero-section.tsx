'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '../scroll-reveal';
import { HeroProductPreview } from '../hero-product-preview';

export function HeroSection() {
  return (
    <section className="pt-52 pb-28 px-6 md:px-12 lg:px-16 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-gradient-to-b from-cyan-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Copy */}
          <ScrollReveal direction="up" duration={0.7}>
            <div className="space-y-12 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700 text-sm font-medium tracking-tight">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                Now in Beta
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1]">
                10x your brand presence.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
                  On autopilot.
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed tracking-tight">
                Pixo&apos;s AI agents work in the background — learning your
                voice, finding opportunities, and preparing content. You just
                review and approve.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link href="/auth?mode=signup">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-base font-semibold bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:-translate-y-0.5 transition-all rounded-xl"
                  >
                    Start Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 text-base border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                  >
                    How It Works
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Product Preview */}
          <ScrollReveal direction="up" delay={0.2} duration={0.7}>
            <div className="relative">
              <HeroProductPreview />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
