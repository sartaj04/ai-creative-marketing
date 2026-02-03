'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Database, Network, User, Sparkles, Layers } from 'lucide-react';

interface LoadingStage {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const LOADING_STAGES: LoadingStage[] = [
    { id: 'profile', label: 'Loading profile data', icon: <User className="w-4 h-4" /> },
    { id: 'identity', label: 'Building identity graph', icon: <Network className="w-4 h-4" /> },
    { id: 'style', label: 'Analyzing style profile', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'persona', label: 'Synthesizing persona', icon: <Layers className="w-4 h-4" /> },
    { id: 'completeness', label: 'Calculating completeness', icon: <Database className="w-4 h-4" /> },
];

interface IdentityLoaderProps {
    isLoading: boolean;
}

export function IdentityLoader({ isLoading }: IdentityLoaderProps) {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);

    useEffect(() => {
        // Reset when loading starts
        if (isLoading) {
            setCurrentStageIndex(0);
        }
    }, [isLoading]);

    useEffect(() => {
        if (!isLoading) {
            return;
        }

        // Standard progression when loading
        if (currentStageIndex < LOADING_STAGES.length - 1) {
            const timeout = setTimeout(() => {
                setCurrentStageIndex(prev => prev + 1);
            }, 600); // 600ms per stage for smooth progression
            return () => clearTimeout(timeout);
        }
    }, [currentStageIndex, isLoading]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md px-6">
                <div className="space-y-4">
                    {LOADING_STAGES.map((stage, index) => {
                        const isActive = index === currentStageIndex && isLoading;
                        const isCompleted = index < currentStageIndex || (!isLoading && index <= currentStageIndex);
                        const isPending = index > currentStageIndex && isLoading;

                        return (
                            <div
                                key={stage.id}
                                className={`relative flex items-center p-4 rounded-xl border transition-all duration-500 ${
                                    isPending ? 'opacity-40' : 'opacity-100'
                                } ${
                                    isActive ? 'bg-white border-cyan-200 shadow-sm scale-[1.02]' : 'bg-transparent border-transparent scale-100'
                                }`}
                            >
                                {/* Icon / Status */}
                                <div className="flex-shrink-0 mr-4">
                                    {isCompleted ? (
                                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center animate-scale-in">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    ) : isActive ? (
                                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center relative">
                                            <div className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                            {stage.icon}
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                            <Circle className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>

                                {/* Text Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {stage.label}
                                    </p>
                                    {isActive && (
                                        <div className="h-1 mt-2 bg-slate-100 rounded-full overflow-hidden w-32">
                                            <div className="h-full bg-cyan-500 animate-progress-bar" />
                                        </div>
                                    )}
                                </div>

                                {/* Skeleton UI Simulation for Active State */}
                                {isActive && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex space-x-1">
                                        {[1, 2, 3].map(i => (
                                            <div
                                                key={i}
                                                className="w-8 h-2 bg-slate-200 rounded-sm animate-pulse"
                                                style={{ animationDelay: `${i * 200}ms` }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
