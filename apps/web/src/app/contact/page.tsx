'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Mail, MessageSquare, MapPin, Send, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { Card } from '@/components/ui/card';
import { CONTACT_FORM_URL } from '@/lib/form-endpoints';

// Note: Metadata needs to be in a separate file or this file needs to be server component.
// Since we need 'use client' for the form, I'll export metadata from a layout or separate page if needed.
// For now, I'll just omit metadata export here or let Next.js handle it if mixed (which it doesn't allowed in client components).
// Actually, I'll make this a client component and wrap it or just use it as is. 
// Standard pattern is page.tsx (server) -> ContactForm (client). 
// But to keep it simple and single-file for now, I'll skip the metadata export in this file
// and just rely on the layout or add it if I split. 
// Wait, I can't export metadata from a use client file.
// I will just make the form a separate component inside the file if I could, but Next.js file routing makes the page the entry.
// So I will make the page.tsx a client component and accept that it won't have specific metadata for now, 
// OR I will make the form a separate component.
// Let's make page.tsx a server component and the form a client component.

// Actually, I can just write the whole thing as a client component for now to be fast, 
// and the metadata will propagate from layout (generic). 
// Better: I'll write the page as server and put the form in a separate file? 
// No, I'll just put the client logic in a wrapper or just use 'use client' and skip specific metadata. 
// Users asked for "create those new pages".
// I'll stick to 'use client' for the whole page for simplicity unless I really need SEO title right now.
// Actually, I can use `document.title` or just not worry about it.
// Let's do it properly: create a client component `ContactForm` in this file (not exported as default) and use it? 
// No, standard is separate files.
// Okay, sticking to 'use client' for the page. It generates a valid page.

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (!CONTACT_FORM_URL) {
            setError('Contact form is not configured.');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);
            const response = await fetch(CONTACT_FORM_URL, {
                method: "POST",
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setIsSuccess(true);
            } else {
                setError('Something went wrong. Please try again.');
                console.error("Form submission failed");
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
            console.error("Form submission error", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
            <Navbar />

            <section className="pt-36 pb-20 px-6 md:px-12 lg:px-16">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

                        {/* Left Column: Info */}
                        <ScrollReveal>
                            <div>
                                <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-4">
                                    Contact Us
                                </p>
                                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                                    Let's get in touch
                                </h1>
                                <p className="text-lg text-slate-500 mb-10 leading-relaxed">
                                    Have questions about our plans, features, or enterprise solutions?
                                    We're here to help.
                                </p>

                                <div className="space-y-8">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                                            <p className="text-slate-500">Our friendly team is here to help. Send a message using the form.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0 text-purple-600">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 mb-1">Support</h3>
                                            <p className="text-slate-500 mb-1">Visit our help center for quick answers.</p>
                                            <Link href="/help" className="text-cyan-600 font-medium hover:underline">Visit Help Center</Link>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-orange-600">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 mb-1">Office</h3>
                                            <p className="text-slate-500">
                                                Hyderabad, India
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Right Column: Form */}
                        <ScrollReveal delay={0.2}>
                            <Card className="p-8 border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
                                {isSuccess ? (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                                        <p className="text-slate-500 mb-8">
                                            Thanks for reaching out. We'll get back to you within 24 hours.
                                        </p>
                                        <Button onClick={() => setIsSuccess(false)} variant="outline">
                                            Send another message
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">First Name</label>
                                                <Input name="firstName" placeholder="Jane" required className="bg-slate-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Last Name</label>
                                                <Input name="lastName" placeholder="Doe" required className="bg-slate-50" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Email</label>
                                            <Input name="email" type="email" placeholder="jane@company.com" required className="bg-slate-50" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Message</label>
                                            <Textarea
                                                name="message"
                                                placeholder="Tell us how we can help..."
                                                className="bg-slate-50 min-h-[120px]"
                                                required
                                            />
                                        </div>

                                        {error && (
                                            <p className="text-sm text-red-600">{error}</p>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold h-12"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                                                </>
                                            ) : (
                                                <>
                                                    Send Message <Send className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                )}
                            </Card>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
