'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Check, Edit2, Share2, Linkedin, Twitter, Sparkles, RefreshCw } from 'lucide-react';

const DUMMY_CARDS = [
    {
        id: 1,
        topic: 'AI Agent Evolution',
        channel: 'LinkedIn',
        confidence: 94,
        content: "The agency model isn't dying, it's evolving. In 2026, the most successful firms won't just sell services, they'll sell intelligent outcomes independent of human hours.\n\nHere is why this shift is inevitable and how you can prepare...",
        tags: ['Future of Work', 'AI Strategy']
    },
    {
        id: 2,
        topic: 'Founder Mental Health',
        channel: 'Twitter',
        confidence: 88,
        content: "1/5 Founders often confuse 'grind' with 'progress'.\n\nReal progress is often invisible. It's the decision you didn't make. The meeting you cancelled. The feature you cut.\n\nEfficiency is doing things right. Effectiveness is doing the right things.",
        tags: ['Leadership', 'Mindset']
    },
    {
        id: 3,
        topic: 'Async Culture',
        channel: 'Blog',
        confidence: 91,
        content: "Remote work culture is broken because we tried to copy-paste the office into Zoom. It's time to rebuild async-first.\n\nWe need to shift from 'presence' to 'productivity' and measure output over hours.",
        tags: ['Remote Work', 'Culture']
    },
];

export default function InboxPage() {
    const [cards, setCards] = useState(DUMMY_CARDS);
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Background color change based on swipe direction
    const bg = useTransform(x, [-200, 0, 200], ["rgba(239, 68, 68, 0.05)", "rgba(255,255,255,0)", "rgba(8, 145, 178, 0.05)"]);

    const handleDragEnd = (event: any, info: any) => {
        if (info.offset.x > 100) {
            removeCard(cards[0].id); // Right swipe (Approve)
        } else if (info.offset.x < -100) {
            removeCard(cards[0].id); // Left swipe (Reject)
        }
    };

    const removeCard = (id: number) => {
        setCards((pv) => pv.filter((c) => c.id !== id));
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
            <motion.div style={{ backgroundColor: bg }} className="absolute inset-0 z-0 transition-colors" />

            {/* Header */}
            <div className="text-center mb-8 z-10 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 mb-2">
                    <Sparkles className="w-3 h-3 text-cyan-600" />
                    {cards.length} Drafts Ready
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Agent Inbox</h1>
                <p className="text-slate-500">Swipe right to approve, left to reject.</p>
            </div>

            {/* Card Stack */}
            <div className="relative w-full max-w-md h-[550px] flex items-center justify-center z-10 px-4">
                <AnimatePresence>
                    {cards.map((card, index) => {
                        const isFront = index === 0;
                        return (
                            <motion.div
                                key={card.id}
                                style={{
                                    zIndex: cards.length - index,
                                    x: isFront ? x : 0,
                                    rotate: isFront ? rotate : 0,
                                    scale: 1 - index * 0.05,
                                    y: index * 15,
                                    opacity: index > 2 ? 0 : 1
                                }}
                                drag={isFront ? "x" : false}
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={handleDragEnd}
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1 - index * 0.05, opacity: index > 2 ? 0 : 1, y: index * 15 }}
                                exit={{ x: x.get() < 0 ? -500 : 500, opacity: 0, transition: { duration: 0.2 } }}
                                className="absolute w-full"
                            >
                                <Card className="h-[480px] w-full shadow-2xl shadow-slate-200/50 border-slate-100 flex flex-col overflow-hidden bg-white select-none cursor-grab active:cursor-grabbing rounded-3xl ring-1 ring-slate-900/5">
                                    {/* Card Header */}
                                    <div className="p-6 pb-4 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                                {card.channel === 'LinkedIn' ? <Linkedin className="w-5 h-5 text-[#0077b5]" /> :
                                                    card.channel === 'Twitter' ? <Twitter className="w-5 h-5 text-[#1DA1F2]" /> :
                                                        <Edit2 className="w-5 h-5 text-slate-400" />}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 text-sm">{card.topic}</h3>
                                                <p className="text-xs text-slate-500">{card.channel} • {new Date().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-xs font-bold border ${card.confidence > 90 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            }`}>
                                            {card.confidence}% Match
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-8 flex-1 flex flex-col bg-white">
                                        <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line font-medium">
                                            {card.content}
                                        </p>

                                        <div className="mt-auto pt-6 flex flex-wrap gap-2">
                                            {card.tags.map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Hints Overlay */}
                                    <motion.div style={{ opacity: useTransform(x, [50, 150], [0, 1]) }} className="absolute inset-0 bg-cyan-500/90 flex flex-col items-center justify-center text-white z-20">
                                        <Check className="w-20 h-20 mb-4" />
                                        <span className="text-2xl font-bold tracking-wide uppercase">Approve</span>
                                    </motion.div>
                                    <motion.div style={{ opacity: useTransform(x, [-150, -50], [1, 0]) }} className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center text-white z-20">
                                        <X className="w-20 h-20 mb-4" />
                                        <span className="text-2xl font-bold tracking-wide uppercase">Reject</span>
                                    </motion.div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {cards.length === 0 && (
                    <div className="text-center space-y-6 animate-fade-in-up">
                        <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto">
                            <RefreshCw className="w-10 h-10 text-slate-300" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-slate-900">All caught up!</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Great job reviewing. Your agents are researching new opportunities for tomorrow.
                            </p>
                        </div>
                        <Button onClick={() => setCards(DUMMY_CARDS)} variant="outline" className="border-cyan-200 text-cyan-700 hover:bg-cyan-50">
                            Regenerate Demo Drafts
                        </Button>
                    </div>
                )}
            </div>

            {/* Action Buttons (Mobile/Desktop) */}
            {cards.length > 0 && (
                <div className="flex gap-8 mt-8 z-10">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-16 w-16 rounded-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:bg-red-50 hover:border-red-200 hover:text-red-500 hover:scale-110 transition-all duration-300"
                        onClick={() => removeCard(cards[0].id)}
                    >
                        <X className="w-8 h-8 text-slate-400" />
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-14 w-14 rounded-full bg-white border border-slate-200 shadow-lg shadow-slate-200/50 text-slate-400 hover:text-cyan-600 hover:border-cyan-200 transition-all"
                    >
                        <Edit2 className="w-6 h-6" />
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-16 w-16 rounded-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-600 hover:scale-110 transition-all duration-300"
                        onClick={() => removeCard(cards[0].id)}
                    >
                        <Check className="w-8 h-8 text-slate-400" />
                    </Button>
                </div>
            )}
        </div>
    );
}
