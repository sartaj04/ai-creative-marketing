import { Metadata } from 'next';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateSEOMetadata({
    title: 'Cookie Policy',
    description: 'Understand how Pixo uses cookies and how you can manage your preferences.',
    path: '/cookies',
});

export default function CookiesPage() {
    return (
        <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
            <Navbar />

            <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                        Cookie Policy
                    </h1>
                    <p className="text-slate-500 mb-12">
                        Last updated: January 28, 2026
                    </p>

                    <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-cyan-600 hover:prose-a:text-cyan-500">
                        <h3>1. What Are Cookies?</h3>
                        <p>
                            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
                        </p>

                        <h3>2. How We Use Cookies</h3>
                        <p>
                            We use cookies to:
                        </p>
                        <ul>
                            <li>Understand and save your preferences for future visits.</li>
                            <li>Compile aggregate data about site traffic and site interactions in order to offer better site experiences and tools in the future.</li>
                            <li>Keep you signed in to our service.</li>
                        </ul>

                        <h3>3. Types of Cookies We Use</h3>
                        <ul>
                            <li><strong>Essential Cookies:</strong> These are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to various actions made by you, such as setting your privacy preferences, logging in, or filling in forms.</li>
                            <li><strong>Performance Cookies:</strong> These allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are different and see how visitors move around the site.</li>
                            <li><strong>Functional Cookies:</strong> These enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.</li>
                        </ul>

                        <h3>4. Managing Cookies</h3>
                        <p>
                            Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer">www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.
                        </p>
                        <p>
                            Please note that if you choose to disable cookies, some sections of our website may not work properly.
                        </p>

                        <h3>5. Contact Us</h3>
                        <p>
                            If you have any questions about our use of cookies, please visit our <a href="/contact">contact page</a>.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
