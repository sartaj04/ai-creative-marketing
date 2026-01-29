'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StaggerContainer, StaggerItem } from '../scroll-reveal';
import { SectionHeader } from './section-header';

type Currency = 'USD' | 'INR';

export function PricingSection() {
  const [currency, setCurrency] = useState<Currency>('USD');

  // Helper to format price
  const formatPrice = (priceUSD: number, priceINR: number) => {
    if (priceUSD === 0 && priceINR === 0) return currency === 'USD' ? '$0' : '₹0';
    return currency === 'USD' ? `$${priceUSD}` : `₹${priceINR}`;
  };

  const pricingTiers = [
    {
      name: 'Starter',
      priceUSD: 0,
      priceINR: 0,
      description: 'Perfect for trying out the agent workflow.',
      cta: 'Get Started',
      ctaVariant: 'outline' as const,
      features: [
        '1 Connected Identity',
        '3 Agent Drafts / week',
        'Basic Analytics',
        'Manual Publishing',
        'Community Support',
      ],
      highlighted: false,
    },
    {
      name: 'Basic',
      priceUSD: 19,
      priceINR: 1500,
      description: 'For individuals just getting started.',
      cta: 'Start Free Trial',
      ctaVariant: 'outline' as const,
      features: [
        '2 Connected Identities',
        '20 Agent Drafts / month',
        'Basic Analytics',
        'Manual Publishing',
        'Email Support',
      ],
      highlighted: false,
    },
    {
      name: 'Pro',
      priceUSD: 49,
      priceINR: 3500,
      description: 'For serious personal brands growing authority.',
      cta: 'Start Free Trial',
      ctaVariant: 'default' as const,
      features: [
        '10 Connected Identities',
        'Unlimited Agent Drafts',
        'Advanced Identity Graph',
        'Auto-Scheduling',
        'Priority Support',
        'Opportunity Scout',
      ],
      highlighted: true,
    },
    {
      name: 'Team',
      priceUSD: 199,
      priceINR: 15000,
      description: 'For agencies and marketing teams.',
      cta: 'Contact Sales',
      ctaVariant: 'outline' as const,
      features: [
        'Unlimited Connected Identities',
        'Team Collaboration',
        'Approval Workflows',
        'Custom Integrations',
        'API Access',
        'Dedicated Account Manager',
      ],
      highlighted: false,
    },
  ];

  return (
    <section
      id="pricing"
      className="py-28 px-6 md:px-12 lg:px-16 bg-white border-t border-slate-100"
    >
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label="Pricing"
          title="Simple, transparent pricing"
          description="Start for free, upgrade as you grow. No hidden fees."
        />

        {/* Currency Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('INR')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'INR'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              INR (₹)
            </button>
          </div>
        </div>

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start"
          staggerDelay={0.1}
        >
          {pricingTiers.map((tier, i) => (
            <StaggerItem key={i}>
              {tier.highlighted ? (
                <div className="relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg shadow-cyan-500/30">
                    Most Popular
                  </div>
                  <Card className="p-8 border-cyan-200 bg-slate-900 rounded-2xl shadow-xl shadow-cyan-900/10 scale-105 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
                    <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-bold text-white">
                        {formatPrice(tier.priceUSD, tier.priceINR)}
                      </span>
                      <span className="text-slate-400">/mo</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-8 leading-relaxed h-[40px]">
                      {tier.description}
                    </p>
                    <Link href="/auth?mode=signup">
                      <Button className="w-full mb-8 bg-cyan-500 hover:bg-cyan-400 text-white border-0 font-semibold shadow-lg shadow-cyan-500/25">
                        {tier.cta}
                      </Button>
                    </Link>
                    <ul className="space-y-4">
                      {tier.features.map((feat, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-3 text-sm text-slate-200"
                        >
                          <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ) : (
                <Card className="p-8 border-slate-200 bg-white rounded-2xl hover:border-slate-300 transition-all duration-300">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-slate-900">
                      {formatPrice(tier.priceUSD, tier.priceINR)}
                    </span>
                    <span className="text-slate-500">/mo</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed h-[40px]">
                    {tier.description}
                  </p>
                  <Link href={tier.name === 'Team' ? '/contact' : '/auth?mode=signup'}>
                    <Button
                      variant="outline"
                      className="w-full mb-8 border-slate-200 hover:bg-slate-50"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                  <ul className="space-y-4">
                    {tier.features.map((feat, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-3 text-sm text-slate-600"
                      >
                        <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
