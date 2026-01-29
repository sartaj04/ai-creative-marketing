'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CompletionStep() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center text-center space-y-8 py-8">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30"
            >
                <Check className="w-12 h-12 text-white" />
            </motion.div>

            <div className="space-y-4 max-w-md">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-semibold text-slate-900"
                >
                    Identity Model Ready
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-600"
                >
                    We've calibrated your personal brand engine. You can now start generating content that sounds exactly like you.
                </motion.p>
            </div>

            <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => router.push('/dashboard')}
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-xl font-medium overflow-hidden transition-all hover:scale-105"
            >
                <span className="relative z-10 flex items-center">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
        </div>
    );
}
