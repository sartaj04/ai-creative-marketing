'use client';

import { motion } from 'framer-motion';
import { Linkedin, FileText, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
    onSelectOption: (option: 'linkedin' | 'manual') => void;
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
                We need to build a base model of your professional identity. The most efficient way is to analyze your existing digital footprint.
            </motion.p>

            <div className="grid grid-cols-1 gap-4">
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
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Import LinkedIn Profile</h3>
                        <p className="text-sm text-slate-500 mt-1">We'll analyze your experience, skills, and endorsements to build your profile.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 absolute right-6 top-1/2 -translate-y-1/2 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </motion.button>

                {/* Manual Entry Option */}
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
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">Start from Scratch</h3>
                        <p className="text-sm text-slate-500 mt-1">Manually configure your identity by answering a series of questions.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 absolute right-6 top-1/2 -translate-y-1/2 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
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
