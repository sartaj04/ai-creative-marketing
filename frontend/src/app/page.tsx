import Link from "next/link";
import { ArrowRight, Sparkles, Palette, Zap, Globe2 } from "lucide-react";
import { DemoCreator } from "@/components/demo-creator";

export default function Home() {
    return (
        <main className="min-h-screen">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 glass">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-2xl font-bold text-primary-500">Pixo</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
                            <Link href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
                            <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
                            <Link
                                href="/register"
                                className="gradient-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
                            >
                                Get Started Free
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                <div className="absolute inset-0 gradient-hero opacity-5"></div>
                <div className="max-w-7xl mx-auto relative">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-600 px-4 py-2 rounded-full mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">AI-Powered Marketing Creatives</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
                            Create Stunning Ads
                            <br />
                            <span className="text-primary-500">in Seconds</span>
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                            Input your website URL, and Pixo generates platform-ready marketing creatives
                            for Instagram, Facebook, LinkedIn, Twitter, and Google Ads.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/register"
                                className="gradient-primary text-white px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition"
                            >
                                Start Creating Free
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="#demo"
                                className="bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-primary-500 transition"
                            >
                                Watch Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Demo Section */}
            <DemoCreator />

            {/* Features Section */}
            <section id="features" className="py-20 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Scale Your Marketing
                        </h2>
                        <p className="text-xl text-gray-600">
                            From e-commerce brands to SaaS companies to personal brands
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
                            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                                <Palette className="w-6 h-6 text-primary-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Auto Brand Extraction</h3>
                            <p className="text-gray-600">
                                Just paste your URL. We automatically extract logos, colors, fonts,
                                and products from your website.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
                            <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mb-4">
                                <Sparkles className="w-6 h-6 text-secondary-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">AI Copy Generation</h3>
                            <p className="text-gray-600">
                                GPT-4 generates compelling ad copy in English, Hindi, Tamil,
                                and Arabic - culturally adapted for Indian audiences.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Instant Creatives</h3>
                            <p className="text-gray-600">
                                Generate 50+ ad variants in seconds. Export as platform-ready
                                images for all major social networks.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Segments Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Built for Your Business
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-8">
                            <Globe2 className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">E-commerce Brands</h3>
                            <p className="text-gray-600">
                                Product ads, sale banners, festival campaigns for Diwali, Eid, Holi & more
                            </p>
                        </div>
                        <div className="text-center p-8">
                            <Zap className="w-12 h-12 text-secondary-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">SaaS Companies</h3>
                            <p className="text-gray-600">
                                Feature announcements, tips, insights, and testimonial graphics
                            </p>
                        </div>
                        <div className="text-center p-8">
                            <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Personal Brands</h3>
                            <p className="text-gray-600">
                                LinkedIn/Twitter posts in your authentic voice with content calendar
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-xl text-gray-600">
                            Start free, upgrade when you need
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Free */}
                        <div className="bg-white p-8 rounded-2xl border-2 border-gray-200">
                            <h3 className="text-xl font-semibold mb-2">Free</h3>
                            <p className="text-gray-600 mb-4">Get started</p>
                            <p className="text-4xl font-bold mb-6">₹0<span className="text-lg text-gray-400">/mo</span></p>
                            <ul className="space-y-3 mb-8 text-gray-600">
                                <li>✓ 10 generations/month</li>
                                <li>✓ 5 basic templates</li>
                                <li>✓ 1 brand profile</li>
                            </ul>
                            <Link href="/register" className="block text-center py-3 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition">
                                Get Started
                            </Link>
                        </div>

                        {/* Starter */}
                        <div className="bg-white p-8 rounded-2xl border-2 border-primary-500 relative">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm">
                                Popular
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Starter</h3>
                            <p className="text-gray-600 mb-4">Growing brands</p>
                            <p className="text-4xl font-bold mb-6">₹499<span className="text-lg text-gray-400">/mo</span></p>
                            <ul className="space-y-3 mb-8 text-gray-600">
                                <li>✓ 100 generations/month</li>
                                <li>✓ All templates</li>
                                <li>✓ 5 brand profiles</li>
                                <li>✓ Multi-language copy</li>
                            </ul>
                            <Link href="/register" className="block text-center py-3 rounded-lg gradient-primary text-white hover:opacity-90 transition">
                                Start Free Trial
                            </Link>
                        </div>

                        {/* Pro */}
                        <div className="bg-white p-8 rounded-2xl border-2 border-gray-200">
                            <h3 className="text-xl font-semibold mb-2">Pro</h3>
                            <p className="text-gray-600 mb-4">Scale unlimited</p>
                            <p className="text-4xl font-bold mb-6">₹1,499<span className="text-lg text-gray-400">/mo</span></p>
                            <ul className="space-y-3 mb-8 text-gray-600">
                                <li>✓ Unlimited generations</li>
                                <li>✓ All templates</li>
                                <li>✓ Unlimited profiles</li>
                                <li>✓ API access</li>
                                <li>✓ Custom templates</li>
                            </ul>
                            <Link href="/register" className="block text-center py-3 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition">
                                Contact Sales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Ready to Transform Your Marketing?
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Join thousands of Indian brands creating stunning ads with AI
                    </p>
                    <Link
                        href="/register"
                        className="gradient-primary text-white px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition"
                    >
                        Start Creating Free
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <h4 className="text-2xl font-bold text-primary-500 mb-4">Pixo</h4>
                            <p className="text-gray-400">
                                AI-powered creative marketing platform for the Indian market.
                            </p>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-4">Product</h5>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                                <li><Link href="#" className="hover:text-white">Templates</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-4">Company</h5>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="#" className="hover:text-white">About</Link></li>
                                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                                <li><Link href="#" className="hover:text-white">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-4">Legal</h5>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                        <p>© 2026 Pixo. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
