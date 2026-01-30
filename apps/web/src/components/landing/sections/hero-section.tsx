import Link from 'next/link';
import { ArrowRight, Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import { ScrollReveal } from '../scroll-reveal';
import { SystemHeroVisual } from '../system-hero-visual';

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 lg:pt-20 lg:pb-32 px-6 md:px-12 lg:px-16 relative overflow-visible z-10 min-h-screen flex items-center justify-center">
      {/* Background Visual Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none scale-95 origin-center select-none">
        <SystemHeroVisual />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="flex flex-col items-center text-center">

          {/* Pixo Mascot - Center Top */}
          <ScrollReveal direction="down" duration={0.5}>
            <div className="flex justify-center mb-12">
              <div className="scale-125 origin-center">
                <PixoCharacter />
              </div>
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
