'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, MessageSquare, Check } from 'lucide-react';
import { VoiceStepData } from '@/lib/api/onboarding';

// Voice post examples - 17 posts across different styles
// IDs must match the backend VOICE_POST_STYLES mapping
const VOICE_POSTS = [
    // Formal/Professional (3)
    {
        id: 'formal_1',
        style: 'Professional',
        styleColor: 'bg-blue-100 text-blue-700',
        content: "After analyzing Q4 metrics across 50+ enterprise clients, three patterns emerged: teams investing in async communication saw 23% higher productivity, documentation-first cultures reduced onboarding time by 40%, and remote-first policies correlated with 15% better retention rates."
    },
    {
        id: 'formal_2',
        style: 'Professional',
        styleColor: 'bg-blue-100 text-blue-700',
        content: "The most successful product launches I've observed share a common thread: ruthless prioritization. It's not about building more features—it's about solving fewer problems exceptionally well."
    },
    {
        id: 'formal_3',
        style: 'Professional',
        styleColor: 'bg-blue-100 text-blue-700',
        content: "Key insight from leading 200+ strategy sessions: Organizations that define success metrics before initiatives begin are 3x more likely to achieve their goals."
    },
    // Casual/Conversational (3)
    {
        id: 'casual_1',
        style: 'Casual',
        styleColor: 'bg-green-100 text-green-700',
        content: "Hot take: Most productivity advice is garbage. Here's what actually works for me after 10 years of trial and error—block your calendar for deep work, say no to 90% of meetings, and stop checking email first thing."
    },
    {
        id: 'casual_2',
        style: 'Casual',
        styleColor: 'bg-green-100 text-green-700',
        content: "Real talk: I used to think working 70-hour weeks was a flex. Now I realize it was just bad planning. The best leaders I know work smart, not hard."
    },
    {
        id: 'casual_3',
        style: 'Casual',
        styleColor: 'bg-green-100 text-green-700',
        content: "Unpopular opinion: Networking events are overrated. The best connections I've made came from genuinely helping people online, no strings attached."
    },
    // Storytelling/Narrative (3)
    {
        id: 'story_1',
        style: 'Storytelling',
        styleColor: 'bg-purple-100 text-purple-700',
        content: "Three years ago, I was about to quit my startup. Burned out. Zero revenue. Then a random coffee chat changed everything. The person across the table asked one question that reframed my entire approach..."
    },
    {
        id: 'story_2',
        style: 'Storytelling',
        styleColor: 'bg-purple-100 text-purple-700',
        content: "My first boss pulled me aside after a failed presentation. Instead of criticism, she said: 'The best speakers make people feel something.' That changed how I communicate forever."
    },
    {
        id: 'story_3',
        style: 'Storytelling',
        styleColor: 'bg-purple-100 text-purple-700',
        content: "I almost turned down the job that changed my career. The salary was lower, the company was unknown. But something felt right. Here's what I learned about trusting your gut..."
    },
    // Data-driven/Analytical (3)
    {
        id: 'data_1',
        style: 'Analytical',
        styleColor: 'bg-amber-100 text-amber-700',
        content: "We A/B tested 47 different onboarding flows over 18 months. The winning version had fewer features, not more. Completion rates jumped 34%. Sometimes the data tells you to simplify."
    },
    {
        id: 'data_2',
        style: 'Analytical',
        styleColor: 'bg-amber-100 text-amber-700',
        content: "Breakdown of 1,000 successful cold emails: 82% were under 100 words, 67% mentioned specific research about the recipient, only 12% asked for a call in the first message."
    },
    {
        id: 'data_3',
        style: 'Analytical',
        styleColor: 'bg-amber-100 text-amber-700',
        content: "Research: Companies with diverse leadership teams outperform by 35% (McKinsey). Yet only 8% of Fortune 500 CEOs are women. The business case is clear—the execution gap is where the work begins."
    },
    // Inspirational/Motivational (3)
    {
        id: 'inspire_1',
        style: 'Inspirational',
        styleColor: 'bg-rose-100 text-rose-700',
        content: "Your next breakthrough is closer than you think. Every expert was once a beginner who refused to quit. Every successful product started as a messy prototype. Keep going."
    },
    {
        id: 'inspire_2',
        style: 'Inspirational',
        styleColor: 'bg-rose-100 text-rose-700',
        content: "The people who change industries aren't necessarily smarter—they're just more persistent. They show up when it's hard. They iterate when others give up."
    },
    {
        id: 'inspire_3',
        style: 'Inspirational',
        styleColor: 'bg-rose-100 text-rose-700',
        content: "Permission you didn't know you needed: It's okay to pivot. It's okay to change your mind. The most successful people I know are professional adapters."
    },
    // Humorous/Playful (2)
    {
        id: 'humor_1',
        style: 'Playful',
        styleColor: 'bg-cyan-100 text-cyan-700',
        content: "Stages of accepting a meeting invite: 1) Sure, that's weeks away 2) Wait, that's next week 3) That's tomorrow?! 4) This could have been an email. We've all been there."
    },
    {
        id: 'humor_2',
        style: 'Playful',
        styleColor: 'bg-cyan-100 text-cyan-700',
        content: "Job titles in 2024: Chief Vibes Officer, Senior Director of Making Things Less Confusing, Head of Actually Getting Stuff Done. Which one are you?"
    }
];

// Split posts into pages of 4
const POSTS_PER_PAGE = 4;
const TOTAL_PAGES = Math.ceil(VOICE_POSTS.length / POSTS_PER_PAGE);

interface VoiceStepProps {
    onComplete: (data: VoiceStepData) => void;
}

export function VoiceStep({ onComplete }: VoiceStepProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const [direction, setDirection] = useState(0);

    const currentPosts = VOICE_POSTS.slice(
        currentPage * POSTS_PER_PAGE,
        (currentPage + 1) * POSTS_PER_PAGE
    );

    const togglePost = (id: string) => {
        setSelectedPosts(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : prev.length < 5
                    ? [...prev, id]
                    : prev
        );
    };

    const handleNext = () => {
        if (currentPage < TOTAL_PAGES - 1) {
            setDirection(1);
            setCurrentPage(prev => prev + 1);
        } else {
            // Complete
            onComplete({
                selected_post_ids: selectedPosts
            });
        }
    };

    const handleBack = () => {
        if (currentPage > 0) {
            setDirection(-1);
            setCurrentPage(prev => prev - 1);
        }
    };

    const canProceed = currentPage === TOTAL_PAGES - 1 ? selectedPosts.length >= 3 : true;

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
            <div className="mb-8">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Page {currentPage + 1} of {TOTAL_PAGES}
                </span>
            </div>

            <div className="relative min-h-[480px]">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentPage}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h3 className="text-2xl font-light text-slate-900">Which posts resonate with your voice?</h3>
                        </div>
                        <p className="text-slate-500 mb-6 text-lg">Select 3-5 posts that match how you'd like to sound</p>

                        <p className="text-sm text-slate-500 mb-4">
                            Selected: {selectedPosts.length}/5 (minimum 3)
                        </p>

                        {/* Posts Grid - 2x2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentPosts.map((post) => {
                                const selected = selectedPosts.includes(post.id);
                                return (
                                    <button
                                        key={post.id}
                                        onClick={() => togglePost(post.id)}
                                        className={`p-5 rounded-xl text-left transition-all duration-200 min-h-[160px] flex flex-col
                                            ${selected
                                                ? 'bg-slate-900 text-white shadow-lg ring-2 ring-slate-900 ring-offset-2 scale-[1.02]'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${selected ? 'bg-white/20 text-white' : post.styleColor}`}>
                                                {post.style}
                                            </span>
                                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                ${selected
                                                    ? 'bg-white border-white'
                                                    : 'border-slate-300'}`}
                                            >
                                                {selected && <Check className="w-4 h-4 text-slate-900" />}
                                            </div>
                                        </div>
                                        <p className={`text-sm leading-relaxed flex-1 ${selected ? 'text-white/90' : 'text-slate-600'}`}>
                                            {post.content}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-8 mt-4 border-t border-slate-100">
                <button
                    onClick={handleBack}
                    disabled={currentPage === 0}
                    className="flex items-center text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>

                <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {currentPage === TOTAL_PAGES - 1 ? 'Complete Setup' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
}
