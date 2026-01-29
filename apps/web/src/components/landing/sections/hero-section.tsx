import Link from 'next/link';
import { ArrowRight, Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '../scroll-reveal';
import { SystemHeroVisual } from '../system-hero-visual';

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 md:px-12 lg:px-16 relative overflow-visible z-10 min-h-screen flex items-center justify-center">
      {/* Background Visual Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none scale-95 origin-center select-none">
        <SystemHeroVisual />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="flex flex-col items-center text-center">

          {/* Badge */}
          <ScrollReveal direction="down" duration={0.5}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm text-slate-600 text-sm font-medium mb-8 hover:border-cyan-300 transition-colors cursor-default group">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span>Proprietary Branding OS</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors ml-1" />
            </div>
          </ScrollReveal>

          {/* Headline */}
          <ScrollReveal direction="up" duration={0.7} delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-semibold tracking-tight text-slate-900 leading-[1.1] max-w-4xl mx-auto mb-8">
              10x your brand presence.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                On autopilot.
              </span>
            </h1>
          </ScrollReveal>

          {/* Subhead */}
          <ScrollReveal direction="up" duration={0.7} delay={0.2}>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
              Pixo is an autonomous brand operating system, powered by a network of agents.
              These agents run continuously to manage and scale your brand presence in the background.
            </p>
          </ScrollReveal>

          {/* CTAs */}
          <ScrollReveal direction="up" duration={0.7} delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/auth?mode=signup">
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all rounded-full min-w-[160px]"
                >
                  Start Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-base bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-full min-w-[160px]"
                >
                  <Play className="mr-2 w-4 h-4 fill-slate-400 text-slate-400" />
                  See how it works
                </Button>
              </Link>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
