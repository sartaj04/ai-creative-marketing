import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Users, Sparkles, Globe, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/landing/scroll-reveal';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateSEOMetadata({
    title: 'About Us',
    description: 'We represent the future of brand management. Learn about our mission to help everyone build professional authority with AI.',
    path: '/about',
});

const values = [
    {
        icon: Sparkles,
        title: 'Authenticity First',
        description: 'We believe AI should amplify your voice, not replace it. Every feature we build is designed to maintain your unique perspective.',
    },
    {
        icon: Target,
        title: 'Quality over Quantity',
        description: 'Viral noise is easy. Building true authority takes substance. We optimize for reputation, not just reach.',
    },
    {
        icon: Users,
        title: 'Democratizing Influence',
        description: 'Professional opportunities shouldn\'t be limited to those who have time to post daily. We level the playing field.',
    },
    {
        icon: Globe,
        title: 'Global Impact',
        description: 'Great ideas come from everywhere. We help professionals across the globe share their expertise with the world.',
    },
];


export default function AboutPage() {
    return (
        <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:48px_48px]" />

                <div className="max-w-4xl mx-auto relative text-center">
                    <ScrollReveal>
                        <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-4">
                            Our Mission
                        </p>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] mb-8">
                            Helping the world's experts{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
                                build authority
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
                            We started Pixo because we saw brilliant people staying silent.
                            The world loses when experts are too busy to share what they know.
                            We're changing that.
                        </p>
                    </ScrollReveal>
                </div>
            </section>


            {/* Values */}
            <section className="py-24 px-6 md:px-12 lg:px-16">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">What drives us</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">
                            We're building more than just a tool. We're building a new way for professionals to interact with the digital world.
                        </p>
                    </div>

                    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8" staggerDelay={0.1}>
                        {values.map((value, i) => (
                            <StaggerItem key={i}>
                                <div className="p-8 rounded-2xl border border-slate-100 bg-white hover:border-cyan-100 hover:shadow-lg hover:shadow-cyan-900/5 transition-all duration-300">
                                    <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-6 text-cyan-600">
                                        <value.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">{value.title}</h3>
                                    <p className="text-slate-500 leading-relaxed">
                                        {value.description}
                                    </p>
                                </div>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 md:px-12 lg:px-16 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />

                <div className="max-w-3xl mx-auto text-center relative">
                    <ScrollReveal>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Join us in shaping the future
                        </h2>
                        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
                            Whether you're looking to build your brand or build the platform that powers it, we'd love to have you.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/auth?mode=signup">
                                <Button size="lg" className="h-14 px-8 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl">
                                    Start Building Your Brand
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button variant="outline" size="lg" className="h-14 px-8 border-slate-700 bg-transparent text-white hover:bg-slate-800 hover:text-white rounded-xl">
                                    Contact Us
                                </Button>
                            </Link>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            <Footer />
        </div>
    );
}
