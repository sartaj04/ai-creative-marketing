import { Metadata } from 'next';
import Link from 'next/link';
import {
  Brain,
  Inbox,
  Sparkles,
  Target,
  Calendar,
  BarChart3,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from '@/components/landing/scroll-reveal';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';
import { features } from '@/data/features';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Features',
  description:
    'Discover all the powerful features of Pixo - from AI-powered content generation to smart scheduling. Everything you need to build a strong personal brand.',
  path: '/features',
  keywords: [
    'AI personal branding features',
    'content automation',
    'linkedin tools',
    'personal branding software features',
  ],
});

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Inbox,
  Sparkles,
  Target,
  Calendar,
  BarChart3,
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-cyan-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-4">
              Features
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] mb-8">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
                scale your brand
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
              Pixo combines AI agents, smart automation, and continuous learning
              to transform how you build professional presence.
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
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <StaggerContainer className="space-y-16" staggerDelay={0.1}>
            {features.map((feature, i) => {
              const Icon = iconMap[feature.icon];
              const isEven = i % 2 === 0;

              return (
                <StaggerItem key={feature.id}>
                  <div
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                      !isEven ? 'lg:flex-row-reverse' : ''
                    }`}
                  >
                    {/* Content */}
                    <div className={!isEven ? 'lg:order-2' : ''}>
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                          feature.highlight ? 'bg-cyan-100' : 'bg-slate-100'
                        }`}
                      >
                        <Icon
                          className={`w-7 h-7 ${
                            feature.highlight ? 'text-cyan-600' : 'text-slate-500'
                          }`}
                        />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                        {feature.title}
                      </h2>
                      <p className="text-lg text-slate-500 mb-6 leading-relaxed">
                        {feature.longDescription}
                      </p>
                      <ul className="space-y-3">
                        {feature.benefits.map((benefit, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-3 text-slate-600"
                          >
                            <Check className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Visual */}
                    <div className={!isEven ? 'lg:order-1' : ''}>
                      <Card
                        className={`p-8 border rounded-2xl h-64 flex items-center justify-center ${
                          feature.highlight
                            ? 'border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-white'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="text-center">
                          <Icon
                            className={`w-16 h-16 mx-auto mb-4 ${
                              feature.highlight
                                ? 'text-cyan-400'
                                : 'text-slate-300'
                            }`}
                          />
                          <p className="text-sm text-slate-400 font-medium">
                            {feature.shortTitle} Preview
                          </p>
                        </div>
                      </Card>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 md:px-12 lg:px-16 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-12 md:p-16 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-[-0.02em] leading-tight mb-4">
                  Ready to transform your personal brand?
                </h2>
                <p className="text-slate-400 mb-8">
                  Start for free. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
