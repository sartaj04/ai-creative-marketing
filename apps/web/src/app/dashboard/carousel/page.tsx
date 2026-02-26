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
import {
    visualTemplatesApi,
    type VisualTemplate,
} from '@/lib/api/visual-templates';
import { getErrorMessage } from '@/lib/api/client';
import { TemplatePreview } from '@/components/media/template-preview';

// ── Constants ───────────────────────────────────────────────────────
type TabId = 'templates' | 'create';

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
    const [tab, setTab] = useState<TabId>('templates');

    // Templates state
    const [templates, setTemplates] = useState<VisualTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    // Template editor state
    const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | null>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [slides, setSlides] = useState<Record<string, string>[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);

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
        setActiveSlide(0);
        setPreviewUrls([]);

        // Build slide data from slides_schema or create empty slides
        const slideCount = t.slide_count || 1;
        const slidesSchema = t.slides_schema;
        const newSlides: Record<string, string>[] = [];

        for (let i = 0; i < slideCount; i++) {
            const slide: Record<string, string> = {};
            if (slidesSchema) {
                // Each slide has per-variable entries
                const slideSchema = slidesSchema[`slide_${i + 1}`] || slidesSchema.slide_template || {};
                Object.keys(slideSchema).forEach((k) => {
                    slide[k] = t.default_values?.[`slide_${i + 1}_${k}`] || t.default_values?.[k] || '';
                });
            }
            // Always ensure title and body exist
            if (!slide.title) slide.title = '';
            if (!slide.body) slide.body = '';
            newSlides.push(slide);
        }
        setSlides(newSlides);
    };

    const updateSlideVar = (slideIdx: number, key: string, value: string) => {
        setSlides((prev) => {
            const updated = [...prev];
            updated[slideIdx] = { ...updated[slideIdx], [key]: value };
            return updated;
        });
    };

    const handlePreviewAll = async () => {
        if (!selectedTemplate) return;
        setIsPreviewing(true);
        try {
            // Build combined variables from all slides
            const allVars: Record<string, any> = { slides: slides };
            slides.forEach((slide, idx) => {
                Object.entries(slide).forEach(([k, v]) => {
                    allVars[`slide_${idx + 1}_${k}`] = v;
                });
            });

            const res = await visualTemplatesApi.preview(selectedTemplate.id, {
                variables: allVars,
            });
            // The API might return a single preview or multiple
            setPreviewUrls([res.preview_url]);
            toast({ title: 'Carousel rendered!' });
        } catch (err) {
            toast({ title: 'Render failed', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsPreviewing(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Layers className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Carousel Maker</h1>
                        <p className="text-sm text-slate-500">Create multi-slide carousels from templates</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 mb-6">
                {([
                    { id: 'templates' as TabId, label: 'Templates', icon: LayoutGrid },
                    { id: 'create' as TabId, label: 'Create New Template', icon: Plus },
                ]).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            if (t.id === 'create') {
                                router.push('/dashboard/template-maker?mode=carousel');
                                return;
                            }
                            setTab(t.id);
                        }}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                            tab === t.id
                                ? 'border-cyan-500 text-cyan-700'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Templates Tab ─────────────────────────────────────── */}
            <div className="flex-1 space-y-4 overflow-auto">
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
                            Create your first carousel template in the Template Maker
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4 gap-2"
                            onClick={() => router.push('/dashboard/template-maker?mode=carousel')}
                        >
                            <Paintbrush className="h-4 w-4" />
                            Open Template Maker
                        </Button>
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
            </div>

            {/* ── Carousel Editor Modal ──────────────────────────────── */}
            <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
                    {selectedTemplate && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Layers className="h-4 w-4" />
                                    {selectedTemplate.name}
                                    <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
                                        {slides.length} slides
                                    </span>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto py-4 space-y-4">
                                {/* Preview area */}
                                <div className="aspect-[16/10] max-h-[250px] rounded-lg border overflow-hidden mx-auto">
                                    {previewUrls.length > 0 ? (
                                        <img src={previewUrls[0]} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <TemplatePreview
                                            htmlTemplate={selectedTemplate.html_template}
                                            previewUrl={selectedTemplate.preview_url}
                                            defaultValues={selectedTemplate.default_values}
                                            dimensions={selectedTemplate.dimensions}
                                        />
                                    )}
                                </div>

                                {/* Slide pills */}
                                <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold">Edit Slides</Label>
                                    </div>

                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {slides.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveSlide(idx)}
                                                className={cn(
                                                    'shrink-0 px-3 py-1 text-xs rounded-full font-medium transition-colors',
                                                    idx === activeSlide
                                                        ? 'bg-cyan-500 text-white'
                                                        : 'bg-white border text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                Slide {idx + 1}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Active slide editor */}
                                    {slides[activeSlide] && (
                                        <div className="bg-white rounded-lg p-3 border space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    Slide {activeSlide + 1} of {slides.length}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost" size="icon" className="h-6 w-6"
                                                        disabled={activeSlide === 0}
                                                        onClick={() => setActiveSlide(activeSlide - 1)}
                                                    ><ChevronLeft className="h-3 w-3" /></Button>
                                                    <Button
                                                        variant="ghost" size="icon" className="h-6 w-6"
                                                        disabled={activeSlide === slides.length - 1}
                                                        onClick={() => setActiveSlide(activeSlide + 1)}
                                                    ><ChevronRight className="h-3 w-3" /></Button>
                                                </div>
                                            </div>

                                            {Object.entries(slides[activeSlide]).map(([key, value]) => (
                                                <div key={key} className="grid gap-1.5">
                                                    <Label className="text-xs capitalize">{key.replace(/_/g, ' ')}</Label>
                                                    {key === 'body' || key === 'content' || key === 'description' ? (
                                                        <Textarea
                                                            value={value}
                                                            onChange={(e) => updateSlideVar(activeSlide, key, e.target.value)}
                                                            className="resize-none h-20 text-sm"
                                                            placeholder={`Enter ${key}...`}
                                                        />
                                                    ) : key === 'image' || key === 'image_url' || key === 'background' ? (
                                                        <div className="space-y-1.5">
                                                            <Input
                                                                value={value}
                                                                onChange={(e) => updateSlideVar(activeSlide, key, e.target.value)}
                                                                className="text-sm"
                                                                placeholder="Paste image URL or leave template default..."
                                                            />
                                                            <p className="text-[10px] text-muted-foreground">
                                                                Leave empty to use the template default image
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            value={value}
                                                            onChange={(e) => updateSlideVar(activeSlide, key, e.target.value)}
                                                            className="text-sm"
                                                            placeholder={`Enter ${key}...`}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handlePreviewAll}
                                    disabled={isPreviewing}
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                                >
                                    {isPreviewing ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Eye className="h-4 w-4 mr-2" />
                                    )}
                                    {previewUrls.length > 0 ? 'Re-render' : 'Preview & Render'}
                                </Button>
                                {previewUrls.length > 0 && (
                                    <Button variant="outline" onClick={() => window.open(previewUrls[0], '_blank')}>
                                        <Download className="h-4 w-4 mr-1" /> Download
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
