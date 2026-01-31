'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { InterestsStepData } from '@/lib/api/onboarding';

// Interest categories with icons (emoji-based for simplicity)
const INTEREST_CATEGORIES = [
    { id: 'reading', label: 'Reading & Books', emoji: '📚' },
    { id: 'fitness', label: 'Fitness & Health', emoji: '💪' },
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'travel', label: 'Travel & Adventure', emoji: '✈️' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮' },
    { id: 'cooking', label: 'Cooking & Food', emoji: '🍳' },
    { id: 'art', label: 'Art & Design', emoji: '🎨' },
    { id: 'photography', label: 'Photography', emoji: '📸' },
    { id: 'sports', label: 'Sports', emoji: '⚽' },
    { id: 'technology', label: 'Technology', emoji: '💻' },
    { id: 'nature', label: 'Nature & Outdoors', emoji: '🌿' },
    { id: 'movies', label: 'Movies & TV', emoji: '🎬' },
    { id: 'writing', label: 'Writing', emoji: '✍️' },
    { id: 'podcasts', label: 'Podcasts', emoji: '🎙️' },
    { id: 'volunteering', label: 'Volunteering', emoji: '🤝' },
    { id: 'meditation', label: 'Meditation & Mindfulness', emoji: '🧘' },
    { id: 'investing', label: 'Investing & Finance', emoji: '📈' },
    { id: 'parenting', label: 'Family & Parenting', emoji: '👨‍👩‍👧' },
];

// Topics of interest for content
const CONTENT_TOPICS = [
    'Artificial Intelligence', 'Startups & Entrepreneurship', 'Leadership',
    'Productivity', 'Career Growth', 'Mental Health', 'Innovation',
    'Sustainability', 'Remote Work', 'Personal Branding', 'Networking',
    'Future of Work', 'Digital Transformation', 'Diversity & Inclusion'
];

interface InterestsStepProps {
    onComplete: (data: InterestsStepData) => void;
}

type Phase = 'interests' | 'topics' | 'aspirations';

export function InterestsStep({ onComplete }: InterestsStepProps) {
    const [phase, setPhase] = useState<Phase>('interests');
    const [direction, setDirection] = useState(0);
    const [formData, setFormData] = useState({
        interests: [] as string[],
        topics_of_interest: [] as string[],
        aspirations: ''
    });

    const toggleInterest = (id: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(id)
                ? prev.interests.filter(i => i !== id)
                : prev.interests.length < 5
                    ? [...prev.interests, id]
                    : prev.interests
        }));
    };

    const toggleTopic = (topic: string) => {
        setFormData(prev => ({
            ...prev,
            topics_of_interest: prev.topics_of_interest.includes(topic)
                ? prev.topics_of_interest.filter(t => t !== topic)
                : prev.topics_of_interest.length < 5
                    ? [...prev.topics_of_interest, topic]
                    : prev.topics_of_interest
        }));
    };

    const handleNext = () => {
        if (phase === 'interests') {
            setDirection(1);
            setPhase('topics');
        } else if (phase === 'topics') {
            setDirection(1);
            setPhase('aspirations');
        } else {
            // Complete
            const selectedInterestLabels = formData.interests.map(id => 
                INTEREST_CATEGORIES.find(c => c.id === id)?.label || id
            );
            onComplete({
                interests: selectedInterestLabels,
                topics_of_interest: formData.topics_of_interest,
                aspirations: formData.aspirations || undefined
            });
        }
    };

    const handleBack = () => {
        if (phase === 'topics') {
            setDirection(-1);
            setPhase('interests');
        } else if (phase === 'aspirations') {
            setDirection(-1);
            setPhase('topics');
        }
    };

    const canProceed = () => {
        switch (phase) {
            case 'interests':
                return formData.interests.length >= 3;
            case 'topics':
                return formData.topics_of_interest.length >= 2;
            case 'aspirations':
                return true; // Optional
            default:
                return false;
        }
    };

    const getPhaseNumber = () => {
        switch (phase) {
            case 'interests': return 1;
            case 'topics': return 2;
            case 'aspirations': return 3;
            default: return 1;
        }
    };

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

    return (
        <div className="w-full">
            <div className="mb-4 sm:mb-8">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Part {getPhaseNumber()} of 3
                </span>
            </div>

            <div className="relative min-h-[350px] sm:min-h-[450px]">
                <AnimatePresence custom={direction} mode="wait">
                    {phase === 'interests' && (
                        <motion.div
                            key="interests"
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full"
                        >
                            <div className="flex items-start sm:items-center gap-3 mb-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 flex-shrink-0">
                                    <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-lg sm:text-2xl font-light text-slate-900">What are your hobbies & interests?</h3>
                            </div>
                            <p className="text-sm sm:text-lg text-slate-500 mb-4 sm:mb-6">Select 3-5 interests that energize you outside of work</p>

                            <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
                                Selected: {formData.interests.length}/5 (minimum 3)
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                {INTEREST_CATEGORIES.map(category => {
                                    const selected = formData.interests.includes(category.id);
                                    return (
                                        <button
                                            key={category.id}
                                            onClick={() => toggleInterest(category.id)}
                                            className={`p-3 sm:p-4 rounded-xl text-left font-medium transition-all duration-200 flex items-center gap-2 sm:gap-3
                                                ${selected
                                                    ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'}`}
                                        >
                                            <span className="text-xl sm:text-2xl">{category.emoji}</span>
                                            <span className="text-xs sm:text-sm">{category.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {phase === 'topics' && (
                        <motion.div
                            key="topics"
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full"
                        >
                            <div className="flex items-start sm:items-center gap-3 mb-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 flex-shrink-0">
                                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-lg sm:text-2xl font-light text-slate-900">What topics fascinate you?</h3>
                            </div>
                            <p className="text-sm sm:text-lg text-slate-500 mb-4 sm:mb-6">Select topics you love thinking and talking about</p>

                            <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
                                Selected: {formData.topics_of_interest.length}/5 (minimum 2)
                            </p>

                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {CONTENT_TOPICS.map(topic => {
                                    const selected = formData.topics_of_interest.includes(topic);
                                    return (
                                        <button
                                            key={topic}
                                            onClick={() => toggleTopic(topic)}
                                            className={`px-3 sm:px-5 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all duration-200
                                                ${selected
                                                    ? 'bg-purple-600 text-white shadow-md scale-105'
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300'}`}
                                        >
                                            {topic}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {phase === 'aspirations' && (
                        <motion.div
                            key="aspirations"
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full"
                        >
                            <div className="flex items-start sm:items-center gap-3 mb-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 flex-shrink-0">
                                    <span className="text-lg sm:text-xl">🚀</span>
                                </div>
                                <h3 className="text-lg sm:text-2xl font-light text-slate-900">What are your aspirations?</h3>
                            </div>
                            <p className="text-sm sm:text-lg text-slate-500 mb-4 sm:mb-8">What are you most excited about achieving in the next few years?</p>

                            <textarea
                                value={formData.aspirations}
                                onChange={(e) => setFormData(prev => ({ ...prev, aspirations: e.target.value }))}
                                placeholder="e.g., Build a successful startup, become a thought leader in my industry, write a book, achieve work-life balance..."
                                rows={4}
                                className="w-full p-3 sm:p-4 text-base sm:text-lg text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-all"
                            />
                            <p className="text-xs sm:text-sm text-slate-400 mt-2">This is optional but helps us personalize your content.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-6 sm:pt-8 mt-4 border-t border-slate-100">
                <button
                    onClick={handleBack}
                    disabled={phase === 'interests'}
                    className="flex items-center text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors text-sm sm:text-base"
                >
                    <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                    Back
                </button>

                <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="bg-slate-900 hover:bg-black text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium flex items-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-sm sm:text-base"
                >
                    {phase === 'aspirations' ? 'Continue' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </button>
            </div>
            
            {/* Bottom safe area spacer for mobile */}
            <div className="h-4 sm:h-0" aria-hidden="true" />
        </div>
    );
}
