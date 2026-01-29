'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Types for our question model
type QuestionType = 'multiselect' | 'slider' | 'text';

interface Question {
    id: string;
    title: string;
    subtitle: string;
    type: QuestionType;
    options?: string[]; // For multiselect
    defaultValue?: any;
}

const QUESTIONS: Question[] = [
    {
        id: 'interests',
        title: 'Core Topics',
        subtitle: 'What themes do you want your personal brand to revolve around?',
        type: 'multiselect',
        options: ['Artificial Intelligence', 'Product Design', 'Startup Strategy', 'Mental Models', 'Remote Work', 'Fintech', 'SaaS Growth']
    },
    {
        id: 'tone',
        title: 'Voice & Tone',
        subtitle: 'How formal should your content sound?',
        type: 'slider', // 0 = Casual, 100 = Formal
        defaultValue: [50]
    },
    {
        id: 'bio',
        title: 'Short Bio',
        subtitle: 'Refine the one-liner we generated for you.',
        type: 'text',
        defaultValue: "Building the future of digital identity."
    }
];

interface IdentityConfigurationStepProps {
    onComplete: (data: any) => void;
}

export function IdentityConfigurationStep({ onComplete }: IdentityConfigurationStepProps) {
    console.log('[IdentityConfigurationStep] Component mounted/rendering');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [direction, setDirection] = useState(0);

    const currentQuestion = QUESTIONS[currentQIndex];
    
    console.log('[IdentityConfigurationStep] Current question index:', currentQIndex, 'Question:', currentQuestion?.id);
    
    // Safety check
    if (!currentQuestion) {
        console.error('[IdentityConfigurationStep] No question found at index', currentQIndex, 'Total questions:', QUESTIONS.length);
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Error loading configuration step</p>
                <button 
                    onClick={() => {
                        console.log('[IdentityConfigurationStep] Skip button clicked');
                        onComplete({});
                    }}
                    className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg"
                >
                    Skip Configuration
                </button>
            </div>
        );
    }
    
    // Debug log
    console.log('[IdentityConfigurationStep] Rendering question:', currentQuestion.id);

    const handleNext = () => {
        if (currentQIndex < QUESTIONS.length - 1) {
            setDirection(1);
            setCurrentQIndex(prev => prev + 1);
        } else {
            onComplete(answers);
        }
    };

    const handleBack = () => {
        if (currentQIndex > 0) {
            setDirection(-1);
            setCurrentQIndex(prev => prev - 1);
        }
    };

    const handleAnswerChange = (val: any) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
    };

    // Variants for slide animation
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -50 : 50,
            opacity: 0
        })
    };

    console.log('[IdentityConfigurationStep] About to render JSX');
    
    return (
        <div className="w-full" data-testid="identity-config-step">
            <div className="mb-8">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Configuration {currentQIndex + 1} of {QUESTIONS.length}
                </span>
            </div>

            <div className="relative min-h-[400px]">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentQuestion.id}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                        <h3 className="text-3xl font-light text-slate-900 mb-2">{currentQuestion.title}</h3>
                        <p className="text-slate-500 mb-10 text-lg">{currentQuestion.subtitle}</p>

                        {/* Question Inputs */}
                        <div className="min-h-[200px]">
                            {currentQuestion.type === 'multiselect' && (
                                <div className="flex flex-wrap gap-3">
                                    {currentQuestion.options?.map(opt => {
                                        const selected = (answers[currentQuestion.id] || []).includes(opt);
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    const current = answers[currentQuestion.id] || [];
                                                    const newVals = current.includes(opt)
                                                        ? current.filter((x: string) => x !== opt)
                                                        : [...current, opt];
                                                    handleAnswerChange(newVals);
                                                }}
                                                className={`
                                        px-6 py-3 rounded-full text-sm font-medium transition-all duration-200
                                        ${selected
                                                        ? 'bg-slate-900 text-white shadow-md scale-105'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}
                                    `}
                                            >
                                                {opt}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {currentQuestion.type === 'slider' && (
                                <div className="py-10 px-4">
                                    <Slider
                                        defaultValue={answers[currentQuestion.id] || currentQuestion.defaultValue}
                                        max={100}
                                        step={1}
                                        onValueChange={(vals: number[]) => handleAnswerChange(vals)}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between mt-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
                                        <span>Casual</span>
                                        <span>Neutral</span>
                                        <span>Formal</span>
                                    </div>
                                </div>
                            )}

                            {currentQuestion.type === 'text' && (
                                <div className="w-full">
                                    <textarea
                                        className="w-full p-6 text-xl text-slate-900 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-cyan-500 resize-none"
                                        rows={4}
                                        defaultValue={answers[currentQuestion.id] || currentQuestion.defaultValue}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-8 mt-4 border-t border-slate-100">
                <button
                    onClick={handleBack}
                    disabled={currentQIndex === 0}
                    className="flex items-center text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>

                <button
                    onClick={handleNext}
                    className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all hover:scale-105 active:scale-95"
                >
                    {currentQIndex === QUESTIONS.length - 1 ? 'Finish Setup' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
}
