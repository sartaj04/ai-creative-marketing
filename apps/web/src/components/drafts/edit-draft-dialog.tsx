'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Draft } from '@/lib/api/drafts';
import { mediaApi, type MediaAsset } from '@/lib/api/media';
import { type VisualTemplate } from '@/lib/api/visual-templates';
import { useToast } from '@/components/ui/use-toast';
import { ImageGeneratorModal } from '@/components/media/image-generator-modal';
import { TemplatePicker } from '@/components/media/template-picker';
import { TemplateEditor } from '@/components/media/template-editor';
import { CarouselViewer } from '@/components/media/carousel-viewer';
import {
    Loader2, Image as ImageIcon, Sparkles, LayoutTemplate,
    ChevronLeft, ChevronRight, Plus, Trash2, LayoutGrid,
} from 'lucide-react';

// ── Carousel body helpers ───────────────────────────────────────────
interface CarouselSlide {
    slide_number: number;
    title: string;
    body: string;
    visual_prompt?: string;
}

interface CarouselBody {
    caption: string;
    slides: CarouselSlide[];
    slide_count: number;
    narrative_arc?: string;
}

function parseCarouselBody(bodyStr: string): CarouselBody | null {
    try {
        const parsed = JSON.parse(bodyStr);
        if (parsed && Array.isArray(parsed.slides)) return parsed as CarouselBody;
    } catch { }
    return null;
}

function serializeCarouselBody(data: CarouselBody): string {
    return JSON.stringify(data);
}

// ── Types ───────────────────────────────────────────────────────────
type EditorTab = 'content' | 'media';

interface EditDraftDialogProps {
    draft: Draft | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (draftId: string, hook: string, body: string) => Promise<void>;
}

export function EditDraftDialog({
    draft,
    open,
    onOpenChange,
    onSave,
}: EditDraftDialogProps) {
    const { toast } = useToast();
    const [hook, setHook] = useState('');
    const [body, setBody] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<EditorTab>('content');

    // Carousel state
    const [carouselData, setCarouselData] = useState<CarouselBody | null>(null);
    const [activeSlideIdx, setActiveSlideIdx] = useState(0);

    // Media state
    const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
    const [showImageGen, setShowImageGen] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | null>(null);
    const [isRendering, setIsRendering] = useState(false);

    const isCarousel = draft?.format === 'carousel';

    // Load draft data
    useEffect(() => {
        if (!draft) return;
        setHook(draft.hook || '');
        setActiveTab('content');
        setActiveSlideIdx(0);
        setSelectedTemplate(null);
        setShowTemplatePicker(false);

        if (draft.format === 'carousel') {
            const parsed = parseCarouselBody(draft.body);
            if (parsed) {
                setCarouselData(parsed);
                setBody(parsed.caption || '');
            } else {
                setBody(draft.body || '');
                setCarouselData(null);
            }
        } else {
            setBody(draft.body || '');
            setCarouselData(null);
        }

        // Load media assets from draft
        if (draft.media_assets && draft.media_assets.length > 0) {
            setMediaAssets(draft.media_assets as MediaAsset[]);
        } else {
            setMediaAssets([]);
        }
    }, [draft]);

    // ── Carousel slide editing ──────────────────────────────────────
    const updateSlide = (idx: number, field: keyof CarouselSlide, value: string) => {
        if (!carouselData) return;
        const updated = { ...carouselData };
        updated.slides = [...updated.slides];
        updated.slides[idx] = { ...updated.slides[idx], [field]: value };
        setCarouselData(updated);
    };

    const addSlide = () => {
        if (!carouselData) return;
        const newSlide: CarouselSlide = {
            slide_number: carouselData.slides.length + 1,
            title: '',
            body: '',
        };
        setCarouselData({
            ...carouselData,
            slides: [...carouselData.slides, newSlide],
            slide_count: carouselData.slide_count + 1,
        });
        setActiveSlideIdx(carouselData.slides.length);
    };

    const removeSlide = (idx: number) => {
        if (!carouselData || carouselData.slides.length <= 1) return;
        const updated = {
            ...carouselData,
            slides: carouselData.slides.filter((_, i) => i !== idx).map((s, i) => ({
                ...s, slide_number: i + 1,
            })),
            slide_count: carouselData.slide_count - 1,
        };
        setCarouselData(updated);
        if (activeSlideIdx >= updated.slides.length) {
            setActiveSlideIdx(updated.slides.length - 1);
        }
    };

    // ── Save ────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!draft) return;
        setIsSaving(true);
        try {
            let finalBody = body;
            if (isCarousel && carouselData) {
                finalBody = serializeCarouselBody({
                    ...carouselData,
                    caption: body,
                });
            }
            await onSave(draft.id, hook, finalBody);
            onOpenChange(false);
        } catch {
            // Error handled by parent
        } finally {
            setIsSaving(false);
        }
    };

    // ── Media callbacks ─────────────────────────────────────────────
    const handleImageGenerated = (imageUrl: string) => {
        // Refresh media from API to get the created asset
        if (draft) {
            mediaApi.listDraftMedia(draft.id).then(setMediaAssets).catch(() => { });
        }
        setShowImageGen(false);
        toast({ title: 'Image generated and attached!' });
    };

    const handleTemplateRender = async (
        variables: Record<string, any>,
        brandOverrides?: Record<string, string>
    ) => {
        if (!draft || !selectedTemplate) return;
        setIsRendering(true);
        try {
            const result = await mediaApi.renderTemplate({
                draft_id: draft.id,
                template_id: selectedTemplate.id,
                variables,
                brand_overrides: brandOverrides || null,
            });
            setMediaAssets((prev) => [...prev, result.media_asset]);
            setSelectedTemplate(null);
            setShowTemplatePicker(false);
            toast({ title: 'Template rendered and attached!' });
        } catch (error: any) {
            toast({ title: 'Render failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsRendering(false);
        }
    };

    const handleDeleteMedia = async (assetId: string) => {
        try {
            await mediaApi.deleteMedia(assetId);
            setMediaAssets((prev) => prev.filter((a) => a.id !== assetId));
            toast({ title: 'Image removed' });
        } catch {
            toast({ title: 'Failed to delete', variant: 'destructive' });
        }
    };

    if (!draft) return null;

    const activeSlide = carouselData?.slides[activeSlideIdx];
    const carouselSlides = mediaAssets.filter((a) => a.type === 'carousel_slide');

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Edit Draft
                            {isCarousel && (
                                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <LayoutGrid className="h-3 w-3" />
                                    Carousel · {carouselData?.slides.length || 0} slides
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {draft.topic && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">
                                    {draft.topic}
                                </span>
                            )}
                            <span className="text-xs capitalize">{draft.format}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-slate-200 -mx-6 px-6">
                        {(['content', 'media'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                        ? 'border-cyan-500 text-cyan-700'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab === 'media' ? (
                                    <span className="flex items-center gap-1.5">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Media
                                        {mediaAssets.length > 0 && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[10px] px-1.5 rounded-full">
                                                {mediaAssets.length}
                                            </span>
                                        )}
                                    </span>
                                ) : tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                        {/* ── Content Tab ───────────────────────────── */}
                        {activeTab === 'content' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="hook">Hook / Title</Label>
                                    <Textarea
                                        id="hook"
                                        value={hook}
                                        onChange={(e) => setHook(e.target.value)}
                                        className="resize-none h-20"
                                        placeholder="Enter your hook..."
                                    />
                                </div>

                                {/* Standard post body */}
                                {!isCarousel && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="body">Content Body</Label>
                                        <Textarea
                                            id="body"
                                            value={body}
                                            onChange={(e) => setBody(e.target.value)}
                                            className="min-h-[200px]"
                                            placeholder="Enter the main content..."
                                        />
                                    </div>
                                )}

                                {/* Carousel editor */}
                                {isCarousel && carouselData && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="caption">Caption (post text)</Label>
                                            <Textarea
                                                id="caption"
                                                value={body}
                                                onChange={(e) => setBody(e.target.value)}
                                                className="resize-none h-16"
                                                placeholder="Caption for the carousel post..."
                                            />
                                        </div>

                                        {/* Carousel preview if has media slides */}
                                        {carouselSlides.length > 0 && (
                                            <CarouselViewer
                                                slides={carouselSlides}
                                                slideTexts={carouselData.slides.map((s) => ({
                                                    title: s.title,
                                                    body: s.body,
                                                }))}
                                                compact
                                            />
                                        )}

                                        {/* Slide editor */}
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-semibold">Slides</Label>
                                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addSlide}>
                                                    <Plus className="h-3 w-3 mr-1" /> Add Slide
                                                </Button>
                                            </div>

                                            {/* Slide pills */}
                                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                {carouselData.slides.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveSlideIdx(idx)}
                                                        className={`shrink-0 px-3 py-1 text-xs rounded-full font-medium transition-colors ${idx === activeSlideIdx
                                                                ? 'bg-cyan-500 text-white'
                                                                : 'bg-white border text-muted-foreground hover:text-foreground'
                                                            }`}
                                                    >
                                                        {idx + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Active slide editor */}
                                            {activeSlide && (
                                                <div className="bg-white rounded-lg p-3 border space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-muted-foreground">
                                                            Slide {activeSlideIdx + 1} of {carouselData.slides.length}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost" size="icon" className="h-6 w-6"
                                                                disabled={activeSlideIdx === 0}
                                                                onClick={() => setActiveSlideIdx(activeSlideIdx - 1)}
                                                            ><ChevronLeft className="h-3 w-3" /></Button>
                                                            <Button
                                                                variant="ghost" size="icon" className="h-6 w-6"
                                                                disabled={activeSlideIdx === carouselData.slides.length - 1}
                                                                onClick={() => setActiveSlideIdx(activeSlideIdx + 1)}
                                                            ><ChevronRight className="h-3 w-3" /></Button>
                                                            {carouselData.slides.length > 1 && (
                                                                <Button
                                                                    variant="ghost" size="icon" className="h-6 w-6 text-red-500"
                                                                    onClick={() => removeSlide(activeSlideIdx)}
                                                                ><Trash2 className="h-3 w-3" /></Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label className="text-xs">Slide Title</Label>
                                                        <Input
                                                            value={activeSlide.title}
                                                            onChange={(e) => updateSlide(activeSlideIdx, 'title', e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Slide title..."
                                                        />
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label className="text-xs">Slide Content</Label>
                                                        <Textarea
                                                            value={activeSlide.body}
                                                            onChange={(e) => updateSlide(activeSlideIdx, 'body', e.target.value)}
                                                            className="resize-none h-24 text-sm"
                                                            placeholder="Slide body text..."
                                                        />
                                                    </div>

                                                    {activeSlide.visual_prompt && (
                                                        <div className="text-[11px] text-muted-foreground bg-slate-50 p-2 rounded">
                                                            <span className="font-medium">Visual hint: </span>
                                                            {activeSlide.visual_prompt}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* ── Media Tab ─────────────────────────────── */}
                        {activeTab === 'media' && (
                            <div className="space-y-4">
                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline" size="sm" className="gap-1.5"
                                        onClick={() => setShowImageGen(true)}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        AI Generate
                                    </Button>
                                    <Button
                                        variant="outline" size="sm" className="gap-1.5"
                                        onClick={() => { setShowTemplatePicker(true); setSelectedTemplate(null); }}
                                    >
                                        <LayoutTemplate className="h-3.5 w-3.5" />
                                        From Template
                                    </Button>
                                </div>

                                {/* Attached images */}
                                {mediaAssets.length > 0 ? (
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground">
                                            Attached Media ({mediaAssets.length})
                                        </Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {mediaAssets.map((asset) => (
                                                <div key={asset.id} className="relative group rounded-lg overflow-hidden border">
                                                    <img
                                                        src={asset.storage_url}
                                                        alt={asset.alt_text || 'Media'}
                                                        className="w-full h-32 object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button
                                                            variant="destructive" size="sm" className="h-7 text-xs"
                                                            onClick={() => handleDeleteMedia(asset.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                                                        </Button>
                                                    </div>
                                                    {asset.type === 'carousel_slide' && asset.slide_index !== null && (
                                                        <span className="absolute top-1 left-1 bg-cyan-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                            Slide {asset.slide_index + 1}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">No media attached yet</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            Generate an AI image or render from a template
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Generator Modal — uses onClose prop */}
            {draft && (
                <ImageGeneratorModal
                    open={showImageGen}
                    onClose={() => setShowImageGen(false)}
                    draftId={draft.id}
                    draftContent={`${draft.hook}\n${draft.body}`}
                    onImageGenerated={handleImageGenerated}
                />
            )}

            {/* Template Picker Dialog */}
            {showTemplatePicker && !selectedTemplate && (
                <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
                    <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Choose a Template</DialogTitle>
                        </DialogHeader>
                        <TemplatePicker
                            type="image"
                            selectedTemplateId={null}
                            onSelect={(template) => setSelectedTemplate(template)}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Template Editor Dialog — uses template object + onRender */}
            {selectedTemplate && draft && (
                <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Fill Template: {selectedTemplate.name}</DialogTitle>
                        </DialogHeader>
                        <TemplateEditor
                            template={selectedTemplate}
                            onRender={handleTemplateRender}
                            isRendering={isRendering}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
