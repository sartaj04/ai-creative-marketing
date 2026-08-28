import { Metadata } from 'next';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateSEOMetadata({
    title: 'Privacy Policy',
    description: 'Learn how Pixo collects, uses, and protects your personal data.',
    path: '/privacy',
});

export default function PrivacyPage() {
    return (
        <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
            <Navbar />

            <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-500 mb-12">
                        Last updated: January 28, 2026
                    </p>

                    <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-cyan-600 hover:prose-a:text-cyan-500">
                        <p>
                            At Pixo, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our application.
                        </p>

                        <h3>1. Collection of Information</h3>
                        <p>
                            We may collect information about you in a variety of ways. The information we may collect includes:
                        </p>
                        <ul>
                            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Site or our mobile application, or when you choose to participate in various activities related to the Site and our mobile application.</li>
                            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
                        </ul>

                        <h3>2. Use of Your Information</h3>
                        <p>
                            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. We may use information collected about you via the Site or our mobile application to:
                        </p>
                        <ul>
                            <li>Create and manage your account.</li>
                            <li>Email you regarding your account or order.</li>
                            <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
                            <li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
                            <li>Increase the efficiency and operation of the Site.</li>
                        </ul>

                        <h3>3. Disclosure of Your Information</h3>
                        <p>
                            We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                        </p>
                        <ul>
                            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
                        </ul>

                        <h3>4. Security of Your Information</h3>
                        <p>
                            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                        </p>

                        <h3>5. Contact Us</h3>
                        <p>
                            If you have questions or comments about this Privacy Policy, please contact us at:
                        </p>
                        <p>
                            <strong>Pixo</strong><br />
                            Hyderabad, India<br />
                            <a href="mailto:hello@trypixo.com">hello@trypixo.com</a>
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
