'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Cpu, Network, User } from 'lucide-react';

interface PipelineStage {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const STAGES: PipelineStage[] = [
    { id: 'parsing', label: 'Parsing document structure', icon: <FileIcon /> },
    { id: 'timeline', label: 'Mapping career timeline', icon: <TimelineIcon /> },
    { id: 'expertise', label: 'Extracting expertise areas', icon: <Cpu className="w-4 h-4" /> },
    { id: 'graph', label: 'Building identity graph', icon: <Network className="w-4 h-4" /> },
    { id: 'voice', label: 'Detecting voice & tone patterns', icon: <User className="w-4 h-4" /> },
];

interface AnalysisLoadingStepProps {
    onComplete: () => void;
    isAnalysisComplete: boolean;
}

export function AnalysisLoadingStep({ onComplete, isAnalysisComplete }: AnalysisLoadingStepProps) {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    
    console.log('[AnalysisLoadingStep] Rendering, isAnalysisComplete:', isAnalysisComplete, 'currentStageIndex:', currentStageIndex);

    useEffect(() => {
        console.log('[AnalysisLoadingStep] useEffect triggered, isAnalysisComplete:', isAnalysisComplete, 'currentStageIndex:', currentStageIndex);
        
        // If analysis is already complete, fast-forward to completion
        if (isAnalysisComplete) {
            console.log('[AnalysisLoadingStep] Analysis complete, fast-forwarding...');
            if (currentStageIndex < STAGES.length - 1) {
                // Fast-forward through remaining stages
                const timeout = setTimeout(() => {
                    console.log('[AnalysisLoadingStep] Fast-forwarding to last stage');
                    setCurrentStageIndex(STAGES.length - 1);
                }, 300);
                return () => clearTimeout(timeout);
            } else {
                // Already at last stage, complete immediately
                console.log('[AnalysisLoadingStep] At last stage, calling onComplete in 1s');
                const timeout = setTimeout(() => {
                    console.log('[AnalysisLoadingStep] Calling onComplete now');
                    onComplete();
                }, 1000);
                return () => clearTimeout(timeout);
            }
        }

        // Standard progression when not complete yet
        if (currentStageIndex < STAGES.length - 1) {
            const timeout = setTimeout(() => {
                console.log('[AnalysisLoadingStep] Advancing to next stage:', currentStageIndex + 1);
                setCurrentStageIndex(prev => prev + 1);
            }, 2000); // 2s per stage
            return () => clearTimeout(timeout);
        }
    }, [currentStageIndex, isAnalysisComplete, onComplete]);

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                {STAGES.map((stage, index) => {
                    const isActive = index === currentStageIndex;
                    const isCompleted = index < currentStageIndex;
                    const isPending = index > currentStageIndex;

                    return (
                        <motion.div
                            key={stage.id}
                            initial={{ opacity: 0.5 }}
                            animate={{
                                opacity: isPending ? 0.4 : 1,
                                scale: isActive ? 1.02 : 1
                            }}
                            className={`relative flex items-center p-4 rounded-xl border transition-colors duration-500
                ${isActive ? 'bg-slate-50 border-cyan-200 shadow-sm' : 'bg-transparent border-transparent'}
              `}
                        >
                            {/* Icon / Status */}
                            <div className="flex-shrink-0 mr-4">
                                {isCompleted ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </motion.div>
                                ) : isActive ? (
                                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center relative">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                            className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full"
                                        />
                                        {stage.icon}
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                        <Circle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1">
                                <p className={`text-sm font-medium transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {stage.label}
                                </p>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-bar"
                                        className="h-1 mt-2 bg-slate-100 rounded-full overflow-hidden w-32"
                                    >
                                        <motion.div
                                            className="h-full bg-cyan-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1.5, ease: "linear" }}
                                        />
                                    </motion.div>
                                )}
                            </div>

                            {/* Skeleton UI Simulation for Active State */}
                            {isActive && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex space-x-1">
                                    {[1, 2, 3].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                            className="w-8 h-2 bg-slate-200 rounded-sm"
                                        />
                                    ))}
                                </div>
                            )}

                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function FileIcon() {
    return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    )
}

function TimelineIcon() {
    return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    )
}
