'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import {
    PenLine,
    Mic,
    FileText,
    Youtube,
    Link2,
    Sparkles,
} from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import { ScratchModal } from '@/components/generators/scratch-modal';
import { AudioModal } from '@/components/generators/audio-modal';
import { PDFModal } from '@/components/generators/pdf-modal';
import { YouTubeModal } from '@/components/generators/youtube-modal';
import { ArticleModal } from '@/components/generators/article-modal';
import { FormatModal } from '@/components/generators/format-modal';

type GeneratorMode = 'scratch' | 'audio' | 'pdf' | 'youtube' | 'article' | 'format' | null;

interface GeneratorCard {
    id: GeneratorMode;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

const GENERATOR_CARDS: GeneratorCard[] = [
    {
        id: 'scratch',
        title: 'Generate from Scratch',
        description: 'Create a post from a topic and key points',
        icon: PenLine,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    {
        id: 'audio',
        title: 'Generate from Audio',
        description: 'Record or upload audio to turn into a post',
        icon: Mic,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
    },
    {
        id: 'pdf',
        title: 'Generate from PDF',
        description: 'Extract insights from a PDF document',
        icon: FileText,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
    },
    {
        id: 'youtube',
        title: 'Generate from YouTube',
        description: 'Turn a YouTube video into a LinkedIn post',
        icon: Youtube,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
    },
    {
        id: 'article',
        title: 'Generate from Article',
        description: 'Share your thoughts on an article',
        icon: Link2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
    },
    {
        id: 'format',
        title: 'Format Your Content',
        description: 'Transform raw text into a polished post',
        icon: Sparkles,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
    },
];

export default function GeneratePage() {
    const [activeModal, setActiveModal] = useState<GeneratorMode>(null);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.25)]">
                            <PixoCharacter />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Generate Posts with Pixo
                    </h1>
                </div>
                <p className="text-slate-500 mt-1">
                    Choose how you want to create your next LinkedIn post. Our multi-agent Pixo system will craft it in your unique voice.
                </p>
            </motion.div>

            {/* How it works */}
            <motion.div variants={itemVariants}>
                <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">How our Pixo agents work together:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold flex-shrink-0">1</span>
                            <span><strong>Identity Agent</strong> analyzes your professional brand</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold flex-shrink-0">2</span>
                            <span><strong>Style Agent</strong> matches your communication tone</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold flex-shrink-0">3</span>
                            <span><strong>Content Agent</strong> extracts key insights</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold flex-shrink-0">4</span>
                            <span><strong>Synthesis Agent</strong> creates the final post</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Generator Cards Grid */}
            <motion.div variants={itemVariants}>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose a Generation Mode</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {GENERATOR_CARDS.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Card
                                key={card.id}
                                className="border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all cursor-pointer group"
                                onClick={() => setActiveModal(card.id)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-6 h-6 ${card.color}`} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                                {card.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </motion.div>

            {/* Note about templates */}
            <motion.div variants={itemVariants}>
                <p className="text-sm text-slate-500 text-center">
                    Each mode includes an optional template selection step to guide the structure of your post.
                </p>
            </motion.div>

            {/* Modals */}
            <ScratchModal
                open={activeModal === 'scratch'}
                onClose={() => setActiveModal(null)}
            />
            <AudioModal
                open={activeModal === 'audio'}
                onClose={() => setActiveModal(null)}
            />
            <PDFModal
                open={activeModal === 'pdf'}
                onClose={() => setActiveModal(null)}
            />
            <YouTubeModal
                open={activeModal === 'youtube'}
                onClose={() => setActiveModal(null)}
            />
            <ArticleModal
                open={activeModal === 'article'}
                onClose={() => setActiveModal(null)}
            />
            <FormatModal
                open={activeModal === 'format'}
                onClose={() => setActiveModal(null)}
            />
        </motion.div>
    );
}
