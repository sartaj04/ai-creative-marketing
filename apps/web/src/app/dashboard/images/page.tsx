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
    Image as ImageIcon, Search, Sparkles, Paintbrush, Loader2,
    Wand2, Download, Eye, LayoutGrid, X,
} from 'lucide-react';
import {
    visualTemplatesApi,
    type VisualTemplate,
} from '@/lib/api/visual-templates';
import { mediaApi } from '@/lib/api/media';
import { getErrorMessage } from '@/lib/api/client';
import { TemplatePreview } from '@/components/media/template-preview';

// ── Constants ───────────────────────────────────────────────────────
type TabId = 'gallery' | 'create';

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
    const [tab, setTab] = useState<TabId>('gallery');

    // Gallery state
    const [templates, setTemplates] = useState<VisualTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | null>(null);

    // Template editor state
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    // AI generate state
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiStyle, setAiStyle] = useState('professional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

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
        setPreviewUrl(null);
        // Seed variables from default_values
        const vars: Record<string, string> = {};
        if (t.variables_schema) {
            Object.keys(t.variables_schema).forEach((k) => {
                vars[k] = t.default_values?.[k] || '';
            });
        }
        setVariables(vars);
    };

    const handlePreview = async () => {
        if (!selectedTemplate) return;
        setIsPreviewing(true);
        try {
            const res = await visualTemplatesApi.preview(selectedTemplate.id, {
                variables,
            });
            setPreviewUrl(res.preview_url);
        } catch (err) {
            toast({ title: 'Preview failed', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsPreviewing(false);
        }
    };

    // ── AI Generate ─────────────────────────────────────────────────
    const handleAiGenerate = async () => {
        setIsGenerating(true);
        setGeneratedUrl(null);
        try {
            // Standalone generation (no draft_id) — generate and show
            const res = await mediaApi.generateImage({
                draft_id: '', // standalone
                prompt: aiPrompt.trim() || null,
                style: aiStyle,
            });
            setGeneratedUrl(res.media_asset.storage_url);
            toast({ title: 'Image generated!' });
        } catch (err) {
            toast({ title: 'Generation failed', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <ImageIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Images</h1>
                        <p className="text-sm text-slate-500">Browse templates or create your own</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 mb-6">
                {([
                    { id: 'gallery' as TabId, label: 'Gallery', icon: LayoutGrid },
                    { id: 'create' as TabId, label: 'Create New', icon: Sparkles },
                ]).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                            tab === t.id
                                ? 'border-purple-500 text-purple-700'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Gallery Tab ──────────────────────────────────────────── */}
            {tab === 'gallery' && (
                <div className="flex-1 space-y-4 overflow-auto">
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
                </div>
            )}

            {/* ── Create Tab ───────────────────────────────────────────── */}
            {tab === 'create' && (
                <div className="flex-1 space-y-6 max-w-3xl">
                    {/* Create options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* AI Generate Card */}
                        <Card className="border-2 border-dashed hover:border-purple-300 transition-colors">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        <Wand2 className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">AI Generate</h3>
                                        <p className="text-xs text-muted-foreground">Create from a prompt</p>
                                    </div>
                                </div>

                                <Textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g., Professional workspace with laptop showing analytics dashboard, warm lighting..."
                                    className="min-h-[80px] text-sm"
                                    disabled={isGenerating}
                                />

                                {/* Style selector */}
                                <div className="flex flex-wrap gap-1.5">
                                    {STYLES.map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => setAiStyle(s.value)}
                                            disabled={isGenerating}
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                                aiStyle === s.value
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-slate-200 text-muted-foreground hover:border-slate-300'
                                            )}
                                        >
                                            {s.emoji} {s.label}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    onClick={handleAiGenerate}
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Wand2 className="h-4 w-4 mr-2" />
                                    )}
                                    {isGenerating ? 'Generating...' : 'Generate Image'}
                                </Button>

                                {/* Generated result */}
                                {generatedUrl && (
                                    <div className="rounded-lg overflow-hidden border">
                                        <img src={generatedUrl} alt="Generated" className="w-full" />
                                        <div className="p-2 flex gap-2">
                                            <Button
                                                variant="outline" size="sm" className="flex-1 text-xs"
                                                onClick={() => window.open(generatedUrl, '_blank')}
                                            >
                                                <Download className="h-3 w-3 mr-1" /> Download
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Design Your Own Card */}
                        <Card
                            className="border-2 border-dashed hover:border-cyan-300 transition-colors cursor-pointer"
                            onClick={() => router.push('/dashboard/template-maker')}
                        >
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[280px] gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <Paintbrush className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Design Your Own</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Open the visual template builder with drag & drop canvas
                                    </p>
                                </div>
                                <Button variant="outline" className="gap-2">
                                    <Paintbrush className="h-4 w-4" />
                                    Open Template Maker
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── Template Editor Modal ───────────────────────────────── */}
            <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    {selectedTemplate && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    {selectedTemplate.name}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {/* Preview */}
                                <div className="aspect-square max-h-[300px] rounded-lg border overflow-hidden mx-auto">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <TemplatePreview
                                            htmlTemplate={selectedTemplate.html_template}
                                            previewUrl={selectedTemplate.preview_url}
                                            defaultValues={variables}
                                            dimensions={selectedTemplate.dimensions}
                                        />
                                    )}
                                </div>

                                {/* Variable fields */}
                                {selectedTemplate.variables_schema &&
                                    Object.keys(selectedTemplate.variables_schema).length > 0 && (
                                        <div className="space-y-3">
                                            <Label className="text-sm font-semibold">Fill Template Variables</Label>
                                            {Object.entries(selectedTemplate.variables_schema).map(([key, schema]: [string, any]) => (
                                                <div key={key} className="grid gap-1.5">
                                                    <Label className="text-xs capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                        {schema?.description && (
                                                            <span className="text-muted-foreground ml-1 font-normal">
                                                                — {schema.description}
                                                            </span>
                                                        )}
                                                    </Label>
                                                    {(schema?.type === 'textarea' || (variables[key]?.length || 0) > 80) ? (
                                                        <Textarea
                                                            value={variables[key] || ''}
                                                            onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                                                            className="text-sm h-20 resize-none"
                                                            placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                                                        />
                                                    ) : (
                                                        <Input
                                                            value={variables[key] || ''}
                                                            onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                                                            className="text-sm"
                                                            placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handlePreview}
                                    disabled={isPreviewing}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                >
                                    {isPreviewing ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Eye className="h-4 w-4 mr-2" />
                                    )}
                                    {previewUrl ? 'Re-render' : 'Preview & Render'}
                                </Button>
                                {previewUrl && (
                                    <Button variant="outline" onClick={() => window.open(previewUrl, '_blank')}>
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
