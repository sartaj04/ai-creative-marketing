'use client';

import { motion } from 'framer-motion';
import { Linkedin, FileText, ArrowRight } from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';

interface WelcomeStepProps {
    onSelectOption: (option: 'linkedin' | 'manual' | 'conversation') => void;
}

export function WelcomeStep({ onSelectOption }: WelcomeStepProps) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            <motion.p variants={itemVariants} className="text-lg text-slate-600 leading-relaxed mb-8">
                Let's build your professional identity together. Share your LinkedIn profile or resume, or speak with Pixo to tell us about yourself.
            </motion.p>

            <div className="grid grid-cols-1 gap-4">
                {/* Chat with Pixo - Primary Option */}
                <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.01, borderColor: "var(--cta)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectOption('conversation')}
                    className="group relative flex items-start p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl shadow-sm hover:shadow-md transition-all text-left"
                >
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden relative mr-4">
                        <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.35)]">
                            <PixoCharacter />
                        </div>
                    </div>
                    <div className="flex-1 pr-12">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">Chat with Pixo</h3>
                            <span className="text-[10px] font-medium bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Recommended</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Have a natural conversation with Pixo. Speak or type - we'll learn about you through dialogue.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cyan-400 absolute right-6 top-1/2 -translate-y-1/2 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </motion.button>

                {/* LinkedIn Import Option */}
                <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.01, borderColor: "var(--cta)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectOption('linkedin')}
                    className="group relative flex items-start p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-left"
                >
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Linkedin className="w-6 h-6" />
                    </div>
                    <div className="flex-1 pr-12">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Import LinkedIn Profile / Resume</h3>
                        <p className="text-sm text-slate-500 mt-1">Upload your LinkedIn profile PDF or resume, and Pixo will analyze your experience and skills.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 absolute right-6 top-1/2 -translate-y-1/2 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </motion.button>

                {/* Manual Form Entry Option */}
                <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.01, borderColor: "var(--cta)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectOption('manual')}
                    className="group relative flex items-start p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-left"
                >
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 pr-12">
                        <h3 className="font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">Fill Out Forms</h3>
                        <p className="text-sm text-slate-500 mt-1">Prefer a structured approach? Answer questions step-by-step through our guided forms.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 absolute right-6 top-1/2 -translate-y-1/2 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </motion.button>
            </div>

            <motion.div variants={itemVariants} className="pt-8 border-t border-slate-100 mt-8">
                <p className="text-xs text-slate-400 text-center">
                    Your data is processed securely and used only to build your personal brand model.
                </p>
            </motion.div>
        </motion.div>
    );
}
