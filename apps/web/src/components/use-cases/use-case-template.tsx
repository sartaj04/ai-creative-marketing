'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Target,
  Brain,
  Shield,
  Users,
  Zap,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/landing/scroll-reveal';
import type { UseCase } from '@/data/use-cases';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  Target,
  Brain,
  Shield,
  Users,
  Zap,
  TrendingUp,
  BarChart3,
};

interface UseCaseTemplateProps {
  useCase: UseCase;
}

export function UseCaseTemplate({ useCase }: UseCaseTemplateProps) {
  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-cyan-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-4">
              {useCase.heroSubtitle}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] mb-8">
              {useCase.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
              {useCase.heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth?mode=signup">
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-semibold bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:-translate-y-0.5 transition-all rounded-xl"
                >
                  Start Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#how-it-helps">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-base border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-6 md:px-12 lg:px-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {useCase.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="py-24 px-6 md:px-12 lg:px-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
                The Challenge
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-[-0.02em]">
                What&apos;s holding you back
              </h2>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.1}>
            {useCase.problems.map((problem, i) => {
              const Icon = iconMap[problem.icon] || Clock;
              return (
                <StaggerItem key={i}>
                  <div className="group p-8 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-50 transition-colors">
                      <Icon className="w-7 h-7 text-slate-400 group-hover:text-red-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      {problem.title}
                    </h3>
                    <p className="text-slate-500 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* Solutions Section */}
      <section
        id="how-it-helps"
        className="py-24 px-6 md:px-12 lg:px-16 bg-slate-900 text-white relative overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-cyan-400 uppercase tracking-widest mb-4">
                The Solution
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em]">
                How Pixo helps
              </h2>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.1}>
            {useCase.solutions.map((solution, i) => (
              <StaggerItem key={i}>
                <Card className="p-8 bg-slate-800/50 border-slate-700/50 rounded-2xl hover:border-cyan-500/30 transition-all duration-300 h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-full">
                      {solution.feature}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {solution.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {solution.description}
                  </p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 md:px-12 lg:px-16 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-12 md:p-16 text-center relative overflow-hidden">
              {/* Background Effects */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-[-0.02em] leading-tight mb-4">
                  {useCase.cta.title}
                </h2>
                <p className="text-slate-400 mb-8">{useCase.cta.subtitle}</p>
                <Link href="/auth?mode=signup">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-base font-semibold bg-cyan-500 hover:bg-cyan-400 text-white shadow-xl shadow-cyan-500/30 rounded-xl"
                  >
                    Start Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
