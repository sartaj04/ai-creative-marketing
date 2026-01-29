import { Navbar, Footer } from '@/components/layout/landing-layout';
import { FAQSection } from '@/components/landing/faq-section';
import {
  HeroSection,
  ProblemSection,
  HowItWorksSection,
  FeaturesSection,
  ComparisonSection,
  UseCasesSection,
  EnterpriseSection,
  PricingSection,
  CTASection,
} from '@/components/landing/sections';
import { SystemBackground } from '@/components/landing/system-background';

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/20">
      <SystemBackground />
      <Navbar />

      <main className="relative z-10">
        {/* Hero Section */}
        <HeroSection />

        {/* Problem Section */}
        <ProblemSection />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Feature Grid */}
        <FeaturesSection />

        {/* Comparison Section */}
        <ComparisonSection />

        {/* Use Cases */}
        <UseCasesSection />

        {/* Enterprise Section */}
        <EnterpriseSection />

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ */}
        <FAQSection />

        {/* Final CTA */}
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
