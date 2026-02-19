'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, ArrowRight, Loader2, Check, Upload, MessageCircle } from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';

interface LinkedInURLStepProps {
    onSubmit: (url: string) => void;
    onSkip?: () => void;
    onUploadResume?: () => void;
    onChatWithPixo?: () => void;
    isSubmitting: boolean;
    isComplete: boolean;
}

const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;

export function LinkedInURLStep({ onSubmit, onSkip, onUploadResume, onChatWithPixo, isSubmitting, isComplete }: LinkedInURLStepProps) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        const trimmed = url.trim();
        if (!trimmed) {
            setError('Please enter your LinkedIn profile URL.');
            return;
        }
        if (!LINKEDIN_URL_REGEX.test(trimmed)) {
            setError('Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)');
            return;
        }
        setError(null);
        onSubmit(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6 sm:space-y-8"
            >
                {/* Pixo Character */}
                <div className="flex justify-center">
                    <div className="scale-[1.2]">
                        <PixoCharacter />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-2">
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                        Welcome to Pixo
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        Paste your LinkedIn profile URL and we'll build your identity automatically.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {isComplete ? (
                        /* Success state */
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 sm:p-8 text-center"
                        >
                            <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-green-700 mb-1">Setting up your profile</h3>
                            <p className="text-sm text-green-600">Redirecting to dashboard...</p>
                        </motion.div>
                    ) : (
                        /* Input state */
                        <motion.div key="input" className="space-y-4">
                            {/* LinkedIn URL Input */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                                        <Linkedin className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => {
                                            setUrl(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="https://linkedin.com/in/yourname"
                                        disabled={isSubmitting}
                                        autoFocus
                                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 placeholder:text-slate-400"
                                    />
                                </div>

                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500"
                                    >
                                        {error}
                                    </motion.p>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !url.trim()}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-medium text-sm sm:text-base hover:bg-black transition-colors disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Analyzing profile...
                                        </>
                                    ) : (
                                        <>
                                            Continue
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </motion.button>
                            </div>

                            {/* Alternative options */}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <p className="text-xs text-slate-400 text-center">Don't have a LinkedIn URL?</p>

                                <div className="flex flex-col gap-3">
                                    {onUploadResume && (
                                        <button
                                            onClick={onUploadResume}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Upload LinkedIn Profile / Resume
                                        </button>
                                    )}
                                    {onChatWithPixo && (
                                        <button
                                            onClick={onChatWithPixo}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl text-sm text-cyan-700 hover:text-cyan-800 transition-colors disabled:opacity-50"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Chat with Pixo
                                        </button>
                                    )}
                                </div>

                                {onSkip && (
                                    <button
                                        onClick={onSkip}
                                        disabled={isSubmitting}
                                        className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                    >
                                        Skip for now
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Consent & Footer */}
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                    By clicking Continue, you confirm that this profile belongs to you and that you have given permission to retrieve its publicly available details. Your data is processed securely and used only to build your personal brand model.
                </p>
            </motion.div>
        </div>
    );
}
