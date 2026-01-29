'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Lock, BarChart, Send, CreditCard } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

// --- Hero Section ---
function Hero() {
    return (
        <section className="relative pt-32 pb-32 md:pt-48 md:pb-48 overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100/50 via-white to-white" />

            <div className="container px-4 md:px-6 mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
                    <div className="flex-1 text-center md:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-600 text-sm font-medium mb-6">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                </span>
                                Partner Program
                            </div>
                            <h1 className="text-4xl md:text-6xl font-display font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
                                Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">50% Recurring</span> Commission with Pixo
                            </h1>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto md:mx-0">
                                Become one of our top affiliate partners and earn a monthly income with 50% recurring commissions for up to 12 months per referred user.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                                <Link href="/contact" className="w-full sm:w-auto">
                                    <Button size="lg" className="rounded-full px-8 h-12 text-base bg-slate-900 hover:bg-slate-800 shadow-lg shadow-cyan-500/20 w-full">
                                        Join for free
                                    </Button>
                                </Link>
                                <Link href="#how-it-works" className="text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors">
                                    How it works &rarr;
                                </Link>
                            </div>
                        </motion.div>
                    </div>

                    <div className="flex-1 flex justify-center md:justify-center md:ml-8 relative">
                        <div className="relative w-[350px] h-[450px] bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 overflow-visible transform rotate-3 hover:rotate-0 transition-transform duration-500">
                            {/* ID Badge Look */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-200 rounded-b-xl z-20 flex justify-center">
                                <div className="w-20 h-1 bg-slate-300 rounded-full mt-1.5" />
                            </div>
                            <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-4 h-24 border-4 border-slate-200 rounded-full z-10" />

                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-100/50 to-transparent" />

                            <div className="relative z-30 mt-8 mb-4">
                                <PixoCharacter />
                            </div>

                            <div className="text-center mt-4">
                                <h3 className="text-xl font-bold text-slate-900">Official Partner</h3>
                                <p className="text-sm text-slate-500 mt-1">Pixo Affiliate Program</p>
                            </div>

                            <div className="mt-6 w-full bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
                                    50%
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Commission</div>
                                    <div className="text-sm font-semibold text-slate-900">Recurring Monthly</div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute top-10 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl dark:bg-blue-900/20" />
                        <div className="absolute bottom-10 left-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl dark:bg-cyan-900/20" />
                    </div>
                </div>
            </div>
        </section>
    );
}

// --- How It Works Section ---
function HowItWorks() {
    const steps = [
        {
            title: "Join for free",
            description: "Signing up takes less than a minute. No approval process needed.",
            icon: Lock,
            color: "bg-orange-100 text-orange-600"
        },
        {
            title: "Get your link",
            description: "Get your unique tracking link to share with your audience.",
            icon: Send,
            color: "bg-blue-100 text-blue-600"
        },
        {
            title: "Share Pixo",
            description: "Promote Pixo to your network via social media, blog, or email.",
            icon: BarChart,
            color: "bg-purple-100 text-purple-600"
        },
        {
            title: "Get paid",
            description: "Earn 50% of every sale you refer for the first 12 months.",
            icon: CreditCard,
            color: "bg-green-100 text-green-600"
        }
    ];

    return (
        <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
            <div className="container px-4 md:px-6 mx-auto relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
                    <p className="text-slate-500 text-lg">Four simple steps to start earning with Pixo.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, i) => (
                        <div key={i} className="relative group">
                            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 h-full transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1">
                                <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center mb-6`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <div className="absolute top-8 right-8 text-6xl font-bold text-slate-100 -z-10 group-hover:text-slate-200 transition-colors">
                                    {i + 1}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{step.description}</p>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-slate-200 -z-10" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// --- Calculator Section ---
function Calculator() {
    const [referrals, setReferrals] = useState(10);
    const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

    // Using Pro plan as the baseline
    const costPerUserUSD = 49;
    const costPerUserINR = 3500;
    const commissionRate = 0.50;

    const costPerUser = currency === 'USD' ? costPerUserUSD : costPerUserINR;
    const monthlyEarnings = Math.round(referrals * costPerUser * commissionRate);
    const yearlyEarnings = monthlyEarnings * 12;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <section className="py-24 bg-slate-50 border-y border-slate-200">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Pixo affiliates on average...</h2>
                    <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
                        Earn up to <span className="text-cyan-600 font-bold">{formatCurrency(currency === 'USD' ? 30417 : 2100000)}/yr</span>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                        {/* Currency Toggle */}
                        <div className="flex justify-end mb-6">
                            <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                                <button
                                    onClick={() => setCurrency('USD')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currency === 'USD'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    USD ($)
                                </button>
                                <button
                                    onClick={() => setCurrency('INR')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currency === 'INR'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    INR (₹)
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="w-full md:w-1/2 space-y-8">
                                <div>
                                    <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 block">
                                        Referrals per month
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            value={[referrals]}
                                            onValueChange={(val) => setReferrals(val[0])}
                                            max={100}
                                            step={1}
                                            className="w-full"
                                        />
                                        <div className="w-16 h-10 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-slate-900 bg-slate-50">
                                            {referrals}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Active paid subscribers</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-slate-600">Commission Rate</span>
                                        <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded">50%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-slate-600">Avg. Revenue / User</span>
                                        <span className="font-medium text-slate-900">{formatCurrency(costPerUser)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-1/2 bg-slate-900 rounded-2xl p-8 text-center text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="text-slate-400 text-sm font-medium mb-2">Estimated Monthly Earnings</div>
                                    <div className="text-5xl font-bold mb-2 tracking-tight">
                                        {formatCurrency(monthlyEarnings)}
                                    </div>
                                    <div className="text-slate-400 text-sm">recurring every month</div>

                                    <div className="mt-8 pt-8 border-t border-slate-800">
                                        <div className="text-slate-400 text-sm font-medium mb-1">Estimated Yearly Earnings</div>
                                        <div className="text-2xl font-bold text-cyan-400">
                                            {formatCurrency(yearlyEarnings)}
                                        </div>
                                    </div>
                                </div>
                                {/* Background glow */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-8 py-6 text-center text-sm text-slate-500 border-t border-slate-100">
                        * Earnings are estimates based on average user lifetime and plan selection.
                    </div>
                </div>
            </div>
        </section>
    );
}

// --- Benefits Section ---
function Benefits() {
    const benefits = [
        {
            title: "50% monthly recurring commissions",
            description: "Earn up to $1000+ per customer within a 12 month period.",
            image: "💰"
        },
        {
            title: "Free yearly membership",
            description: "Become a Pixo partner to earn a free Yearly Membership worth $250+.",
            image: "🎁"
        },
        {
            title: "Provenance-backed content",
            description: "Win your high-performing audience with Provenance-backed content.",
            image: "📝"
        },
        {
            title: "Dedicated support",
            description: "Get direct access to our team for any questions you might have.",
            image: "🤝"
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-6 p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-2xl shrink-0">
                                {benefit.image}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{benefit.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// --- FAQ Section ---
// Custom FAQ data for Affiliate page
const affiliateFaqs = [
    {
        question: "How do I get paid?",
        answer: "We pay out efficiently via PayPal or direct bank transfer on the 1st of every month. The minimum payout threshold is $50."
    },
    {
        question: "Is it free to join?",
        answer: "Yes, joining the Pixo Affiliate Program is 100% free. There are no setup fees or hidden costs."
    },
    {
        question: "Do I need to be a Pixo customer?",
        answer: "No, you don't need to be a paying customer to be an affiliate. However, we highly recommend trying out the product so you can promote it authentically."
    },
    {
        question: "How long is the cookie duration?",
        answer: "We offer a 60-day cookie window. This means if someone clicks your link and signs up within 60 days, you get the commission."
    },
    {
        question: "Can I run ads?",
        answer: "You can run ads to promote your own content (like a blog post review), but we do not allow bidding on branded keywords (like 'Pixo', 'Pixo AI', etc.) in search engines."
    }
];

function AffiliateFAQ() {
    return (
        <section className="py-24 bg-slate-50">
            <div className="container px-4 md:px-6 mx-auto max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">FAQ</h2>
                    <p className="text-slate-500">Common questions about our partner program.</p>
                </div>

                <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border border-slate-200 px-6 py-2 shadow-sm">
                    {affiliateFaqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="border-b-slate-100 last:border-0">
                            <AccordionTrigger className="text-left text-slate-900 font-medium py-5 hover:text-cyan-600 transition-colors">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pb-5 leading-relaxed">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                <div className="mt-16 text-center">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Have more questions?</h3>
                    <p className="text-slate-500 mb-6">Reach out to our affiliate support team.</p>
                    <div className="flex justify-center gap-4">
                        <Link href="/contact">
                            <Button variant="outline" className="rounded-full">Contact Support</Button>
                        </Link>
                        <Link href="/contact">
                            <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800">Join Program</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// --- Main Page Component ---
export default function AffiliatePage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main>
                <Hero />
                <HowItWorks />
                <Calculator />
                <Benefits />
                <AffiliateFAQ />
            </main>
            <Footer />
        </div>
    );
}
