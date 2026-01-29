'use client';

import Link from 'next/link';
import { Users, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollReveal } from '../scroll-reveal';
import { SectionHeader } from './section-header';

const teamFeatures = [
  'Team member management',
  'Shared content calendar',
  'Approval workflows',
  'Team analytics',
  'Brand voice consistency',
  'Collaborative editing',
];

export function EnterpriseSection() {
  return (
    <section className="py-28 px-6 md:px-12 lg:px-16 bg-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-100/40 rounded-full blur-[100px] pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto relative">
        <SectionHeader
          label="Teams"
          title="Designed for teams"
          description="Coordinate your team's professional presence from one place."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Team Features */}
          <ScrollReveal delay={0.1}>
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <Card className="p-5 bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">
                        Team Workspaces
                      </h4>
                      <p className="text-sm text-slate-500">
                        Manage multiple team members in one dashboard
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">
                        Company Branding
                      </h4>
                      <p className="text-sm text-slate-500">
                        Keep messaging aligned across your organization
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {teamFeatures.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-slate-600 text-sm"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Right: CTA */}
          <ScrollReveal delay={0.2}>
            <div className="lg:pl-8">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">
                Need a plan for your team?
              </h3>
              <p className="text-slate-500 mb-6">
                We're building team features and would love to hear what you need.
                Get in touch to share your requirements.
              </p>
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-slate-900 text-white hover:bg-slate-800 font-semibold rounded-xl"
                >
                  Get in Touch
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
