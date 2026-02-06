'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Plus, X } from 'lucide-react';

interface ContentFocusStepProps {
    suggestedTopics: string[];
    onSubmit: (topics: string[]) => void;
    onSkip?: () => void;
    isSubmitting: boolean;
}

export function ContentFocusStep({ suggestedTopics, onSubmit, onSkip, isSubmitting }: ContentFocusStepProps) {
    const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(suggestedTopics));
    const [customInput, setCustomInput] = useState('');
    const [customTopics, setCustomTopics] = useState<string[]>([]);

    const toggleTopic = (topic: string) => {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topic)) {
                next.delete(topic);
            } else {
                next.add(topic);
            }
            return next;
        });
    };

    const addCustomTopic = () => {
        const trimmed = customInput.trim();
        if (trimmed && !customTopics.includes(trimmed) && !suggestedTopics.includes(trimmed)) {
            setCustomTopics(prev => [...prev, trimmed]);
            setSelectedTopics(prev => new Set([...Array.from(prev), trimmed]));
            setCustomInput('');
        }
    };

    const removeCustomTopic = (topic: string) => {
        setCustomTopics(prev => prev.filter(t => t !== topic));
        setSelectedTopics(prev => {
            const next = new Set(prev);
            next.delete(topic);
            return next;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomTopic();
        }
    };

    const handleSubmit = () => {
        const allTopics = Array.from(selectedTopics);
        if (allTopics.length > 0) {
            onSubmit(allTopics);
        }
    };

    const totalSelected = selectedTopics.size;

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg space-y-6 sm:space-y-8"
            >
                {/* Title */}
                <div className="text-center space-y-2">
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                        What do you want to post about?
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        Based on your profile, we suggest these topics. Toggle to select or deselect.
                    </p>
                </div>

                {/* Suggested Topics */}
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {suggestedTopics.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50
                                    ${selectedTopics.has(topic)
                                        ? 'bg-slate-900 text-white shadow-md scale-105'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                {topic}
                            </button>
                        ))}
                    </div>

                    {/* Custom Topics */}
                    {customTopics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {customTopics.map((topic) => (
                                <span
                                    key={topic}
                                    className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                                        ${selectedTopics.has(topic)
                                            ? 'bg-cyan-600 text-white shadow-md'
                                            : 'bg-white border border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <button onClick={() => toggleTopic(topic)} disabled={isSubmitting}>
                                        {topic}
                                    </button>
                                    <button
                                        onClick={() => removeCustomTopic(topic)}
                                        disabled={isSubmitting}
                                        className="ml-1 hover:text-red-300 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Add Custom Topic */}
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Plus className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add your own topic..."
                            disabled={isSubmitting}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 placeholder:text-slate-400"
                        />
                        {customInput.trim() && (
                            <button
                                onClick={addCustomTopic}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-600 font-medium hover:text-cyan-700"
                            >
                                Add
                            </button>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleSubmit}
                        disabled={isSubmitting || totalSelected === 0}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-medium text-sm sm:text-base hover:bg-black transition-colors disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                Continue ({totalSelected} selected)
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </motion.button>

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

                <p className="text-xs text-slate-400 text-center">
                    You can always change these later from your identity page.
                </p>
            </motion.div>
        </div>
    );
}
