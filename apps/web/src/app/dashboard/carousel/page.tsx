'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
    LayoutGrid, Search, Paintbrush, Loader2,
    Eye, Download, ChevronLeft, ChevronRight, Image as ImageIcon,
    Plus, Layers,
} from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import {
    visualTemplatesApi,
    type VisualTemplate,
} from '@/lib/api/visual-templates';
import { getErrorMessage } from '@/lib/api/client';
import { TemplatePreview } from '@/components/media/template-preview';
import { TemplateEditorModal } from '@/components/media/template-editor-modal';

// ── Constants ───────────────────────────────────────────────────────

const CATEGORIES = [
    { value: '', label: 'All' },
    { value: 'tips', label: 'Tips' },
    { value: 'story', label: 'Story' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'how-to', label: 'How-To' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'case-study', label: 'Case Study' },
    { value: 'educational', label: 'Educational' },
];

// ── Page ────────────────────────────────────────────────────────────
export default function CarouselPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Templates state
    const [templates, setTemplates] = useState<VisualTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    // Template editor state
    const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | null>(null);

    // ── Load templates ──────────────────────────────────────────────
    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await visualTemplatesApi.list({
                type: 'carousel',
                category: category || undefined,
                search: search || undefined,
                limit: 50,
            });
            setTemplates(res.templates);
        } catch (err) {
            console.error('Failed to load carousel templates:', err);
        } finally {
            setIsLoading(false);
        }
    }, [category, search]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // ── Template selection ──────────────────────────────────────────
    const handleSelectTemplate = (t: VisualTemplate) => {
        setSelectedTemplate(t);
    };

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
            className="h-full flex flex-col space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.25)]">
                            <PixoCharacter />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Carousel Templates</h1>
                    </div>
                </div>
                <p className="text-slate-500 mt-1">Create multi-slide carousels from templates</p>
            </motion.div>

            {/* ── Templates ─────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex-1 space-y-4 overflow-auto">
                {/* Search & filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search carousel templates..."
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                        <Badge
                            key={cat.value}
                            variant={category === cat.value ? 'default' : 'outline'}
                            className={cn(
                                'cursor-pointer transition-colors',
                                category === cat.value
                                    ? 'bg-cyan-600 hover:bg-cyan-500'
                                    : 'hover:bg-slate-100'
                            )}
                            onClick={() => setCategory(cat.value)}
                        >
                            {cat.label}
                        </Badge>
                    ))}
                </div>

                {/* Template grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No carousel templates found</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                            No templates are currently available.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {templates.map((template) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card
                                    className="cursor-pointer transition-all hover:shadow-lg hover:border-cyan-300 hover:-translate-y-0.5 group"
                                    onClick={() => handleSelectTemplate(template)}
                                >
                                    <CardContent className="p-3">
                                        <div className="aspect-[4/3] rounded-lg mb-2 overflow-hidden relative">
                                            <TemplatePreview
                                                htmlTemplate={template.html_template}
                                                previewUrl={template.preview_url}
                                                defaultValues={template.default_values}
                                                dimensions={template.dimensions}
                                            />
                                            {/* Slide count badge */}
                                            <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1 z-10">
                                                <Layers className="h-2.5 w-2.5" />
                                                {template.slide_count || '?'} slides
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-medium truncate">{template.name}</h4>
                                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                                            {template.category}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Carousel Editor Modal ──────────────────────────────── */}
            <TemplateEditorModal
                open={!!selectedTemplate}
                onOpenChange={(open) => !open && setSelectedTemplate(null)}
                template={selectedTemplate}
            />
        </motion.div>
    );
}
