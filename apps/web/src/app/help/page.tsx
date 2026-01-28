import { Metadata } from 'next';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateSEOMetadata({
    title: 'Help Center',
    description: 'Frequently asked questions and support for Pixo.',
    path: '/help',
});

const faqs = [
    {
        category: "General",
        questions: [
            {
                q: "What is Pixo?",
                a: "Pixo is an AI-powered personal branding platform designed to help professionals, executives, and founders build authority and grow their network with minimal time investment."
            },
            {
                q: "How does the AI work?",
                a: "Our AI agents analyze your profile, industry trends, and unique voice to generate high-quality content, engagement opportunities, and strategic insights tailored specifically to you."
            }
        ]
    },
    {
        category: "Account & Billing",
        questions: [
            {
                q: "Can I cancel my subscription?",
                a: "Yes, you can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period."
            },
            {
                q: "Do you offer enterprise plans?",
                a: "Yes, we offer custom enterprise solutions for teams and organizations. Please contact our sales team at hello@neurocell.in for more information."
            }
        ]
    },
    {
        category: "Features",
        questions: [
            {
                q: "Is my data secure?",
                a: "Absolutely. We use industry-standard encryption and security practices to ensure your personal data and content strategies remain private and secure."
            },
            {
                q: "Can I use Pixo for multiple platforms?",
                a: "Currently, we focus primarily on LinkedIn and professional networks, but we are actively expanding to support other platforms relevant to professional branding."
            }
        ]
    }
];

export default function HelpPage() {
    return (
        <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
            <Navbar />

            <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-4">
                            Support
                        </p>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                            Help Center
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                            Find answers to common questions about managing your personal brand with Pixo.
                        </p>
                    </div>

                    <div className="grid gap-12">
                        {faqs.map((section, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">
                                    {section.category}
                                </h2>
                                <div className="space-y-8">
                                    {section.questions.map((item, qIdx) => (
                                        <div key={qIdx}>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                                {item.q}
                                            </h3>
                                            <p className="text-slate-600 leading-relaxed">
                                                {item.a}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 text-center bg-cyan-50 rounded-2xl p-12">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                            Still have questions?
                        </h3>
                        <p className="text-slate-600 mb-8 max-w-lg mx-auto">
                            Can't find the answer you're looking for? Our team is here to help you get the most out of Pixo.
                        </p>
                        <a
                            href="mailto:hello@neurocell.in"
                            className="inline-flex items-center justify-center h-12 px-8 font-semibold text-white transition-colors bg-cyan-600 rounded-lg hover:bg-cyan-500"
                        >
                            Contact Support
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
