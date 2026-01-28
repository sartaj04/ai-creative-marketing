'use client';

import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

export function NewsletterForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);
            const response = await fetch("https://formspree.io/f/mpqrazej", {
                method: "POST",
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setIsSuccess(true);
            } else {
                console.error("Form submission failed");
            }
        } catch (error) {
            console.error("Form submission error", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100 max-w-md mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-green-800 font-medium">Thanks for subscribing!</p>
                <p className="text-green-600 text-sm">We'll verify your email.</p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium underline"
                >
                    Subscribe another email
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                disabled={isSubmitting}
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
                {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    'Subscribe'
                )}
            </button>
        </form>
    );
}
