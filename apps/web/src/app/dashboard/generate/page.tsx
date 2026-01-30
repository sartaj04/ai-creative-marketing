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
    Lightbulb,
    Target,
    AlertTriangle,
    Layers,
    Wrench,
    TrendingUp
} from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import { ScratchModal } from '@/components/generators/scratch-modal';
import { AudioModal } from '@/components/generators/audio-modal';
import { PDFModal } from '@/components/generators/pdf-modal';
import { YouTubeModal } from '@/components/generators/youtube-modal';
import { ArticleModal } from '@/components/generators/article-modal';
import { FormatModal } from '@/components/generators/format-modal';
import { TemplateGeneratorModal } from '@/components/generators/template-generator-modal';
import { Badge } from '@/components/ui/badge';

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

interface TemplateCard {
    id: string;
    title: string;
    description: string;
    category: string; // Used for backend goal/tag mapping
    icon: React.ElementType;
    colors: string;
}

const RECOMMENDED_TEMPLATES: TemplateCard[] = [
    {
        id: 'myth_buster',
        title: 'Myth Buster',
        description: 'Challenge a common industry misconception.',
        category: 'contrarian',
        icon: AlertTriangle,
        colors: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:border-yellow-400'
    },
    {
        id: 'case_study',
        title: 'Case Study',
        description: 'Share a customer success story or project win.',
        category: 'story',
        icon: Target,
        colors: 'bg-green-50 text-green-600 border-green-200 hover:border-green-400'
    },
    {
        id: 'mistake_story',
        title: 'Mistake Story',
        description: 'Share a lesson learned from a past mistake.',
        category: 'story',
        icon: AlertTriangle,
        colors: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-400'
    },
    {
        id: 'framework',
        title: 'Framework',
        description: 'Explain a concept using a step-by-step framework.',
        category: 'educational',
        icon: Layers,
        colors: 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400'
    },
    {
        id: 'tool_review',
        title: 'Tool Review',
        description: 'Review a tool or resource you use.',
        category: 'promotional',
        icon: Wrench,
        colors: 'bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400'
    },
    {
        id: 'prediction',
        title: 'Prediction',
        description: 'Share a prediction for your industry future.',
        category: 'thought_leadership',
        icon: TrendingUp,
        colors: 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:border-cyan-400'
    }
];

export default function GeneratePage() {
    const [activeModal, setActiveModal] = useState<GeneratorMode>(null);
    const [activeTemplate, setActiveTemplate] = useState<TemplateCard | null>(null);

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

            {/* Generator Cards Grid */}
            <motion.div variants={itemVariants}>
                {/* <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose a Generation Mode</h2> */}
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

            {/* Recommended Templates Section */}
            <motion.div variants={itemVariants} className="pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-6">
                    <Lightbulb className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <h2 className="text-xl font-bold text-slate-900">Recommended Templates</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {RECOMMENDED_TEMPLATES.map((template) => {
                        const Icon = template.icon;
                        return (
                            <div
                                key={template.id}
                                onClick={() => setActiveTemplate(template)}
                                className={`
                                    relative overflow-hidden rounded-xl border p-5 cursor-pointer transition-all duration-300
                                    hover:shadow-md hover:-translate-y-1 group bg-white
                                    ${template.colors.includes('border') ? '' : 'border-slate-200'}
                                    ${template.colors.split(' ').find(c => c.startsWith('border-')) || 'border-slate-200'}
                                `}
                            >
                                <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                    <Icon className="w-24 h-24" />
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${template.colors.split(' ')[0]} ${template.colors.split(' ')[1]}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <h3 className="font-bold text-slate-900 mb-1Group-hover:text-cyan-700 transition-colors">
                                        {template.title}
                                    </h3>

                                    <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                        {template.description}
                                    </p>

                                    <div className="mt-auto">
                                        <Badge variant="outline" className="bg-white/50 text-slate-500 font-normal text-xs group-hover:bg-white group-hover:text-cyan-600 transition-colors">
                                            Use Template &rarr;
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
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

            {/* Template Generator Modal */}
            <TemplateGeneratorModal
                open={!!activeTemplate}
                onClose={() => setActiveTemplate(null)}
                templateCategory={activeTemplate?.category || ''}
                categoryTitle={activeTemplate?.title || 'Template'}
            />
        </motion.div>
    );
}
