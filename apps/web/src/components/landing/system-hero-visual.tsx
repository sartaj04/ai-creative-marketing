'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
    Inbox,
    Sparkles,
    CheckCircle2,
    TrendingUp,
    User,
    Send,
    Zap,
    BarChart3
} from 'lucide-react';

function SideCard({
    side,
    delay,
    children,
    className
}: {
    side: 'left' | 'right';
    delay: number;
    children: React.ReactNode;
    className?: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: side === 'left' ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.8, type: 'spring' }}
            className={`absolute ${side === 'left' ? 'left-4 top-1/2 -translate-y-1/2' : 'right-4 top-1/2 -translate-y-1/2'} w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/60 p-4 ${className}`}
        >
            {children}
        </motion.div>
    );
}

export function SystemHeroVisual() {
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % 3);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full min-h-[600px] pointer-events-none overflow-hidden">

            {/* LEFT SIDE: Input / Detection */}
            <div className="absolute left-0 top-0 bottom-0 w-1/3 min-w-[300px] hidden md:block">
                <motion.div
                    className="absolute top-[20%] left-[10%]"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="w-64 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Inbox className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">Content Sources</p>
                                <p className="text-[10px] text-slate-400">Indexing...</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                LinkedIn Profile
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Company Blog
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Industry News
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="absolute bottom-[25%] left-[15%]"
                    animate={{ y: [0, 15, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                    <div className="w-56 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-slate-100 p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span className="text-xs font-medium text-slate-700">Signals Detected</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            {['#AI', '#Growth', '#SaaS'].map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* RIGHT SIDE: Output / Results */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 min-w-[300px] hidden md:block">
                <motion.div
                    className="absolute top-[25%] right-[10%]"
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                >
                    <div className="w-64 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-700">Agent Output</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">v2.4</span>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeStep}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="p-3 bg-cyan-50/50 rounded-lg border border-cyan-100"
                                >
                                    {activeStep === 0 && (
                                        <div className="flex gap-3">
                                            <Zap className="w-4 h-4 text-cyan-600 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-medium text-cyan-900">Drafting Thread</p>
                                                <p className="text-[10px] text-cyan-700 mt-0.5">"5 lessons from scaling..."</p>
                                            </div>
                                        </div>
                                    )}
                                    {activeStep === 1 && (
                                        <div className="flex gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-medium text-green-900">Ready for Review</p>
                                                <p className="text-[10px] text-green-700 mt-0.5">High confidence score (94%)</p>
                                            </div>
                                        </div>
                                    )}
                                    {activeStep === 2 && (
                                        <div className="flex gap-3">
                                            <Send className="w-4 h-4 text-blue-600 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-medium text-blue-900">Scheduled</p>
                                                <p className="text-[10px] text-blue-700 mt-0.5">Queue: Tomorrow, 9:00 AM</p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="absolute bottom-[20%] right-[15%]"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                >
                    <div className="w-56 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-slate-100 p-3">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-medium text-slate-700">Projected Reach</span>
                        </div>
                        <div className="h-16 flex items-end gap-1 px-1">
                            {[30, 45, 35, 60, 50, 75, 65].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 10 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 }}
                                    className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-sm"
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
