"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Sparkles,
    Zap,
    Globe,
    Palette,
    LayoutGrid,
    ShoppingBag,
    Building2,
    User,
    Check,
    Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const segments = [
    {
        id: "ecommerce",
        title: "E-commerce",
        description: "Product ads, sale announcements, new arrivals",
        icon: ShoppingBag,
        color: "from-orange-500 to-red-500",
        examples: ["Shopify", "WooCommerce", "Etsy"],
    },
    {
        id: "saas",
        title: "SaaS",
        description: "Feature highlights, testimonials, comparisons",
        icon: Building2,
        color: "from-blue-500 to-purple-500",
        examples: ["Product launches", "LinkedIn posts", "Twitter threads"],
    },
    {
        id: "personal",
        title: "Personal Brand",
        description: "LinkedIn content, Twitter posts, thought leadership",
        icon: User,
        color: "from-green-500 to-teal-500",
        examples: ["Coaches", "Consultants", "Creators"],
    },
];

const features = [
    {
        icon: Zap,
        title: "Instant Generation",
        description:
            "Generate 20+ creative variants in under 60 seconds. No design skills needed.",
    },
    {
        icon: Globe,
        title: "Multi-Language",
        description:
            "Create content in Hindi, Tamil, Bengali, Arabic, and English.",
    },
    {
        icon: Palette,
        title: "Brand Consistency",
        description:
            "Extract your brand colors, fonts, and voice automatically from your website.",
    },
    {
        icon: LayoutGrid,
        title: "Platform Ready",
        description:
            "Auto-sized for Instagram, Facebook, LinkedIn, Twitter, and Google Ads.",
    },
];

const pricing = [
    {
        name: "Free",
        price: "₹0",
        period: "forever",
        features: [
            "10 generations/month",
            "3 templates",
            "1 brand profile",
            "Basic support",
        ],
        cta: "Get Started",
        popular: false,
    },
    {
        name: "Starter",
        price: "₹1,999",
        period: "/month",
        features: [
            "200 generations/month",
            "All templates",
            "5 brand profiles",
            "Priority support",
            "Festival themes",
        ],
        cta: "Start Free Trial",
        popular: true,
    },
    {
        name: "Pro",
        price: "₹4,999",
        period: "/month",
        features: [
            "Unlimited generations",
            "All templates",
            "Unlimited profiles",
            "API access",
            "White-label exports",
            "Dedicated support",
        ],
        cta: "Contact Sales",
        popular: false,
    },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-grid-pattern">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <Link href="/" className="flex items-center space-x-2">
                            <Sparkles className="h-8 w-8 text-brand-pink" />
                            <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                                BrandScale<span className="text-brand-pink">AI</span>
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center space-x-10">
                            <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-brand-pink transition-colors">Features</Link>
                            <Link href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-brand-pink transition-colors">Pricing</Link>
                            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-brand-pink transition-colors">Login</Link>
                            <Link href="/register" className="btn-premium py-2.5 px-6 text-sm">Get Started Free</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-brand-pink/5 border border-brand-pink/10 mb-10">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-pink opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-pink"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">AI-Powered Creative Marketing</span>
                        </div>

                        <h1 className="hero-heading mb-8">
                            Launch <span className="text-brand-pink">10x more</span><br />
                            content. <span className="text-brand-orange">75% faster.</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                            Stop spending hours on manual design. Our AI extracts your brand identity and generates
                            hundreds of platform-ready creatives in seconds.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
                            <Link href="/register" className="btn-premium text-lg group">
                                Start Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="#segments" className="text-lg font-bold text-slate-900 dark:text-white hover:text-brand-pink transition-colors flex items-center">
                                See Examples <Zap className="ml-2 h-5 w-5 fill-brand-orange text-brand-orange" />
                            </Link>
                        </div>

                        {/* Floating Mascot/Dashboard Image Placeholder */}
                        <div className="relative max-w-5xl mx-auto mt-12 rounded-3xl overflow-hidden shadow-2xl border-8 border-white dark:border-slate-900 group">
                            <div className="absolute inset-0 bg-brand-gradient opacity-0 group-hover:opacity-10 transition-opacity z-10"></div>
                            <img
                                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000"
                                alt="Dashboard Preview"
                                className="w-full h-auto grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Background Blobs */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-pink/10 rounded-full blur-[120px] -z-10"></div>
                <div className="absolute top-1/4 right-0 -translate-x-1/4 w-[400px] h-[400px] bg-brand-orange/10 rounded-full blur-[100px] -z-10"></div>
            </section>

            {/* Social Proof Bar */}
            <section className="py-12 border-y border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/10">
                <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                    <span className="text-2xl font-black text-slate-400 tracking-tighter">NIKE</span>
                    <span className="text-2xl font-black text-slate-400 tracking-tighter">ZARA</span>
                    <span className="text-2xl font-black text-slate-400 tracking-tighter">ASOS</span>
                    <span className="text-2xl font-black text-slate-400 tracking-tighter">CANVA</span>
                    <span className="text-2xl font-black text-slate-400 tracking-tighter">SHOPIFY</span>
                </div>
            </section>

            {/* "Used by" Grid Section */}
            <section id="segments" className="py-32 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="section-heading mb-6">Built for people doing the work.</h2>
                        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Whether you're a solopreneur or a high-growth scaleup, we've got you covered.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-10">
                        {segments.map((segment, idx) => (
                            <motion.div
                                key={segment.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="glass-card rounded-[2.5rem] p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                            >
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${segment.color} flex items-center justify-center mb-10 shadow-lg`}>
                                    <segment.icon className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">{segment.title}</h3>
                                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                                    {segment.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {segment.examples.map(ex => (
                                        <span key={ex} className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-500">{ex}</span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials (Holo style) */}
            <section className="py-32 px-4 bg-slate-50 dark:bg-slate-900/20">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Sample Testimonial Card */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                                    <img src="https://i.pravatar.cc/150?u=anna" alt="User" />
                                </div>
                                <div>
                                    <div className="font-black text-slate-900 dark:text-white flex items-center">
                                        Anna Clark <CheckCircle2 className="h-4 w-4 ml-1 text-blue-500 fill-blue-500" />
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold">@annacreates · Mar 8, 2024</div>
                                </div>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                                I run everything solo and Holo basically saved my life lol. Content posts, ads, everything ready without babysitting. 10/10.
                            </p>
                            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" className="rounded-2xl w-full h-48 object-cover grayscale group-hover:grayscale-0 transition-all" alt="Testimonial photo" />
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl lg:translate-y-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                                    <img src="https://i.pravatar.cc/150?u=luke" alt="User" />
                                </div>
                                <div>
                                    <div className="font-black text-slate-900 dark:text-white flex items-center">
                                        Luke Lefler <CheckCircle2 className="h-4 w-4 ml-1 text-blue-500 fill-blue-500" />
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold">@lukelef · Mar 4, 2024</div>
                                </div>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                Getting started was easy - way easier than I thought. Took about 10 min and my brand context was ready to go.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                                    <img src="https://i.pravatar.cc/150?u=rachel" alt="User" />
                                </div>
                                <div>
                                    <div className="font-black text-slate-900 dark:text-white flex items-center">
                                        Rachel Green <CheckCircle2 className="h-4 w-4 ml-1 text-blue-500 fill-blue-500" />
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold">@rachg · Mar 2, 2024</div>
                                </div>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
                                I'm not super techy and this was simple to set up. Content actually matched our style. Would recommend!
                            </p>
                            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800" className="rounded-2xl w-full h-48 object-cover opacity-80" alt="Testimonial photo" />
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-32 px-4">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-5xl font-black text-center mb-20 tracking-tighter">FAQ</h2>
                    <div className="space-y-4">
                        {[
                            "How does the AI ad generator work?",
                            "Do I need design skills to use BrandScale?",
                            "Can I manage multiple brands in one account?",
                            "Is it better than ChatGPT for marketing?",
                            "Do you have a free trial?"
                        ].map((q, i) => (
                            <div key={i} className="group glass-card p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-brand-pink/30 flex items-center justify-between cursor-pointer">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{q}</span>
                                <PlusIcon className="h-5 w-5 text-slate-400 group-hover:rotate-45 transition-transform" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 px-4 relative overflow-hidden">
                <div className="max-w-5xl mx-auto glass-card rounded-[3rem] p-16 text-center border-2 border-brand-pink/20 relative z-10">
                    <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">
                        Ready to create<br />
                        <span className="text-gradient">agency-like content?</span>
                    </h2>
                    <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 font-bold">(Without the fees)</p>
                    <Link href="/register" className="btn-premium py-6 px-12 text-2xl shadow-xl shadow-brand-pink/40">
                        Buy now — it's free!
                    </Link>
                </div>

                {/* Playful Mascot in corner */}
                <div className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 -z-10 opacity-20">
                    <Sparkles className="w-[600px] h-[600px] text-brand-pink rotate-12" />
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-8 border-t border-slate-100 dark:border-slate-900">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                    <div>
                        <Link href="/" className="flex items-center space-x-2 mb-4">
                            <Sparkles className="h-6 w-6 text-brand-pink" />
                            <span className="text-xl font-black tracking-tighter">BrandScale AI</span>
                        </Link>
                        <p className="text-slate-500 font-bold">The ad engine for the next generation of brands.</p>
                    </div>
                    <div className="flex gap-10 text-sm font-black text-slate-400 uppercase tracking-widest">
                        <Link href="#">Support</Link>
                        <Link href="#">Terms</Link>
                        <Link href="#">Privacy</Link>
                    </div>
                    <div className="text-slate-400 font-black">© 2024 ALL RIGHTS RESERVED</div>
                </div>
            </footer>
        </div>
    );
}

function PlusIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}

function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}

