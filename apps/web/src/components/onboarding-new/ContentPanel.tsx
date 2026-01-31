'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ContentPanelProps {
    children: ReactNode;
    title: string;
    stepIndicator: string;
}

export function ContentPanel({ children, title, stepIndicator }: ContentPanelProps) {
    console.log('[ContentPanel] Rendering, title:', title, 'hasChildren:', !!children);
    return (
        <div className="h-full w-full bg-white flex flex-col relative overflow-hidden">
            {/* Top Bar */}
            <div className="w-full px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    {stepIndicator}
                </span>
                {/* Optional Top Right actions */}
            </div>

            {/* Main Content Area - scrollable with safe area padding */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-12 pb-32 sm:pb-24">
                    <motion.div
                        key={title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">{title}</h2>

                        <div className="mt-6 sm:mt-8">
                            {children || (
                                <div className="text-slate-500 p-8 border border-slate-200 rounded-lg">
                                    <p>No content available for this step.</p>
                                    <p className="text-xs mt-2">Step: {title}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                    
                    {/* Bottom safe area spacer for mobile */}
                    <div className="h-16 sm:h-8 flex-shrink-0" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
