'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
    Image as ImageIcon, Search, LayoutGrid, Loader2,
} from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import {
    visualTemplatesApi,
    type VisualTemplate,
} from '@/lib/api/visual-templates';
import { mediaApi } from '@/lib/api/media';
import { getErrorMessage } from '@/lib/api/client';
import { TemplatePreview } from '@/components/media/template-preview';
import { TemplateEditorModal } from '@/components/media/template-editor-modal';

// ── Constants ───────────────────────────────────────────────────────

const CATEGORIES = [
    { value: '', label: 'All' },
    { value: 'quote', label: 'Quote' },
    { value: 'stat', label: 'Stats' },
    { value: 'tips', label: 'Tips' },
    { value: 'story', label: 'Story' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'checklist', label: 'Checklist' },
];

const STYLES = [
    { value: 'professional', label: 'Professional', emoji: '💼' },
    { value: 'creative', label: 'Creative', emoji: '🎨' },
    { value: 'minimal', label: 'Minimal', emoji: '✨' },
    { value: 'bold', label: 'Bold', emoji: '⚡' },
    { value: 'abstract', label: 'Abstract', emoji: '🌀' },
];

// ── Page ────────────────────────────────────────────────────────────
export default function ImagesPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Gallery state
    const [templates, setTemplates] = useState<VisualTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | null>(null);
    // ── Load templates ──────────────────────────────────────────────
    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await visualTemplatesApi.list({
                type: 'image',
                category: category || undefined,
                search: search || undefined,
                limit: 50,
            });
            setTemplates(res.templates);
        } catch (err) {
            console.error('Failed to load templates:', err);
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
    // ── Render ───────────────────────────────────────────────────────
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.25)]">
                            <PixoCharacter />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Image Templates
                    </h1>
                </div>
                <p className="text-slate-500 mt-1">
                    Browse and customize visual templates for your posts.
                </p>
            </motion.div>

            {/* ── Gallery ──────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex-1 space-y-4 overflow-auto">
                {/* Search & filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search templates..."
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
                                    ? 'bg-purple-600 hover:bg-purple-500'
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
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No image templates found</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                            Try a different category or create your own
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {templates.map((template) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card
                                    className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 hover:-translate-y-0.5 group"
                                    onClick={() => handleSelectTemplate(template)}
                                >
                                    <CardContent className="p-3">
                                        <div className="aspect-square rounded-lg mb-2 overflow-hidden">
                                            <TemplatePreview
                                                htmlTemplate={template.html_template}
                                                previewUrl={template.preview_url}
                                                defaultValues={template.default_values}
                                                dimensions={template.dimensions}
                                            />
                                        </div>
                                        <h4 className="text-xs font-medium truncate">{template.name}</h4>
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
            {/* ── Template Editor Modal ───────────────────────────────── */}
            <TemplateEditorModal
                open={!!selectedTemplate}
                onOpenChange={(open) => !open && setSelectedTemplate(null)}
                template={selectedTemplate}
            />
        </motion.div>
    );
}
