'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

export interface AgentState {
    status: 'idle' | 'analyzing' | 'building' | 'waiting';
    message: string;
}

interface AgentPanelProps {
    step: number;
    totalSteps: number;
    agentState: AgentState;
}

export function AgentPanel({ step, totalSteps, agentState }: AgentPanelProps) {
    // Orb pulse animation based on state
    const getOrbVariants = () => {
        switch (agentState.status) {
            case 'analyzing':
                return {
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8],
                    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                };
            case 'building':
                return {
                    scale: [1, 1.1, 1],
                    rotate: [0, 180, 360],
                    transition: { duration: 3, repeat: Infinity, ease: 'linear' }
                };
            case 'waiting':
            default:
                return {
                    scale: [1, 1.05, 1],
                    opacity: [0.6, 0.8, 0.6],
                    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                };
        }
    };

    return (
        <div className="h-full w-full bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-500 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-8">
                    <div className="w-10 h-10 relative rounded-lg overflow-hidden">
                        <Image
                            src="/android-chrome-192x192.png"
                            alt="Pixo Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className="text-[28px] font-display font-bold tracking-tight text-white">
                        Pixo<sup className="text-[12px] font-semibold text-cyan-400 ml-0.5 -top-2">ai</sup>
                    </span>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-light text-slate-100 leading-tight">
                        Setting up your <br />
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                            Identity Model
                        </span>
                    </h1>
                </div>
            </div>

            {/* Center Agent Visualization */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-12">
                <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Core Orb */}
                    <motion.div
                        animate={getOrbVariants()}
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 blur-md absolute z-10"
                    />
                    {/* Outer Rings */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-32 h-32 rounded-full border border-slate-700/50 absolute"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="w-40 h-40 rounded-full border border-slate-700/30 border-dashed absolute"
                    />
                </div>

                {/* Dynamic Status Message */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={agentState.message}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-8 flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-sm"
                    >
                        {agentState.status === 'analyzing' || agentState.status === 'building' ? (
                            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                        <span className="text-sm font-medium text-cyan-100 tracking-wide">
                            {agentState.message}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Progress */}
            <div className="relative z-10">
                <div className="flex flex-col space-y-4">
                    <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
                        <span>System Initialization</span>
                        <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / totalSteps) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>

                    <div className="pt-4 flex items-center space-x-2 text-xs text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-green-500/50" />
                        <span>Secure Environment Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
