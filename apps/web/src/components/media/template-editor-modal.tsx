'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Loader2, Trash2, Undo2, ChevronLeft, ChevronRight, LayoutTemplate,
    Wand2, Save, Download, Plus, Eye
} from 'lucide-react';
import type { VisualTemplate, VariableFieldSchema } from '@/lib/api/visual-templates';
import { TemplatePreview } from '@/components/media/template-preview';
import { cn } from '@/lib/utils';
import { visualTemplatesApi } from '@/lib/api/visual-templates';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { ImageVariablePicker } from '@/components/media/image-variable-picker';

interface TemplateEditorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: VisualTemplate | null;
}

export function TemplateEditorModal({
    open,
    onOpenChange,
    template,
}: TemplateEditorModalProps) {
    const { toast } = useToast();
    const [localValues, setLocalValues] = useState<Record<string, any>>({});
    const [activeSlideIdx, setActiveSlideIdx] = useState(0);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [zipDownloadUrl, setZipDownloadUrl] = useState<string | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const isCarousel = template?.type === 'carousel';
    const slideCount = template?.slide_count || 1;

    useEffect(() => {
        if (open && template) {
            setLocalValues({ ...(template.default_values || {}) });
            setActiveSlideIdx(0);
            setPreviewUrls([]);
            setPdfUrl(null);
            setPdfDownloadUrl(null);
            setDownloadUrl(null);
            setZipDownloadUrl(null);
        } else {
            setLocalValues({});
            setActiveSlideIdx(0);
            setPreviewUrls([]);
            setPdfUrl(null);
            setPdfDownloadUrl(null);
            setDownloadUrl(null);
            setZipDownloadUrl(null);
        }
    }, [open, template]);

    // ── Handlers ────────────────────────────────────────────────────────

    const handleValueChange = (key: string, value: any) => {
        setLocalValues(prev => ({ ...prev, [key]: value }));
        setPreviewUrls([]);
        setPdfUrl(null);
        setPdfDownloadUrl(null);
        setDownloadUrl(null);
        setZipDownloadUrl(null);
    };

    const handleArrayItemChange = (key: string, index: number, value: string) => {
        setLocalValues(prev => {
            const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
            arr[index] = value;
            return { ...prev, [key]: arr };
        });
        setPreviewUrls([]);
        setPdfUrl(null);
        setPdfDownloadUrl(null);
        setDownloadUrl(null);
        setZipDownloadUrl(null);
    };

    const handleAddArrayItem = (key: string) => {
        setLocalValues(prev => {
            const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
            arr.push('');
            return { ...prev, [key]: arr };
        });
        setPreviewUrls([]);
        setPdfUrl(null);
        setPdfDownloadUrl(null);
        setDownloadUrl(null);
        setZipDownloadUrl(null);
    };

    const handleRemoveArrayItem = (key: string, index: number) => {
        setLocalValues(prev => {
            const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
            arr.splice(index, 1);
            return { ...prev, [key]: arr };
        });
        setPreviewUrls([]);
        setPdfUrl(null);
        setPdfDownloadUrl(null);
        setDownloadUrl(null);
        setZipDownloadUrl(null);
    };

    const handlePreview = async () => {
        if (!template) return;
        setIsPreviewing(true);
        try {
            const res = await visualTemplatesApi.preview(template.id, {
                variables: localValues,
            });
            setPreviewUrls(res.preview_urls || (res.preview_url ? [res.preview_url] : []));
            setPdfUrl(res.pdf_url || null);
            setPdfDownloadUrl(res.pdf_download_url || null);
            setDownloadUrl(res.download_url || null);
            setZipDownloadUrl(res.zip_download_url || null);
        } catch (err) {
            toast({ title: 'Preview failed', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleDownload = async (forcedUrl?: string, isZip: boolean = false) => {
        const urlToDownload = forcedUrl || pdfDownloadUrl || downloadUrl || pdfUrl || previewUrls[0];
        if (!urlToDownload) return;

        toast({ title: 'Downloading...', description: 'Fetching your file.' });

        // Use a hidden anchor tag to trigger the browser's native download behavior via the presigned URL
        // (The presigned URL forces `response-content-disposition=attachment` from S3)
        const a = document.createElement('a');
        a.href = urlToDownload;
        a.download = `${template?.name || 'template'}${isZip ? '.zip' : pdfUrl ? '.pdf' : '.png'}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ── Variable parsing ────────────────────────────────────────────────

    const variables = Object.entries(template?.variables_schema || {});

    // ── Filter Out Layout Variables ─────────────────────────────────────
    const layoutKeywords = ['padding', 'margin', 'radius', 'width', 'height', 'top', 'left', 'right', 'bottom', 'gap', 'spacing', 'opacity', 'z_index', 'size', 'align', 'justify'];
    const filteredVariables = variables.filter(([key]) => !layoutKeywords.some(k => key.toLowerCase().includes(k)));

    // Split into global (Global Settings) and slide-specific (Content)
    const globalKeywords = ['color', 'font', 'author', 'handle', 'profile', 'logo', 'username', 'avatar', 'theme', 'image', 'bg'];

    let globalVariables = filteredVariables.filter(([key]) => globalKeywords.some(k => key.toLowerCase().includes(k)));
    let contentVariables = filteredVariables.filter(([key]) => !globalVariables.some(([bKey]) => bKey === key));

    const getSlideNumber = (key: string) => {
        const match = key.match(/slide_?(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
    };

    let currentSlideVariables: typeof variables = [];

    if (isCarousel) {
        globalVariables = globalVariables.filter(([key]) => getSlideNumber(key) === null);

        const currentSlide = template?.slides?.[activeSlideIdx];
        if (currentSlide) {
            let slideSchemaKeys: string[] = [];
            if (currentSlide.variable_schema && Object.keys(currentSlide.variable_schema).length > 0) {
                slideSchemaKeys = Object.keys(currentSlide.variable_schema);
            } else if (currentSlide.html_structure) {
                const matches = currentSlide.html_structure.match(/\{\{([^}]+)\}\}/g) || [];
                slideSchemaKeys = Array.from(new Set(matches.map(m => m.replace(/[{{}}]/g, '').trim())));
            }

            if (slideSchemaKeys.length > 0) {
                currentSlideVariables = filteredVariables.filter(([key]) =>
                    slideSchemaKeys.includes(key) && getSlideNumber(key) !== null
                );
            } else {
                const currentSlideNum = activeSlideIdx + 1;
                currentSlideVariables = filteredVariables.filter(([key]) => getSlideNumber(key) === currentSlideNum);
            }
        } else {
            const currentSlideNum = activeSlideIdx + 1;
            currentSlideVariables = filteredVariables.filter(([key]) => getSlideNumber(key) === currentSlideNum);
        }

        // Content variables that are strictly for slide 1 (no slide number, but not global)
        if (activeSlideIdx === 0) {
            contentVariables = filteredVariables.filter(([key]) =>
                !globalVariables.some(([bKey]) => bKey === key) &&
                getSlideNumber(key) === null &&
                !currentSlideVariables.some(([cKey]) => cKey === key)
            );
        } else {
            contentVariables = [];
        }
    }

    // ── Renderers ────────────────────────────────────────────────────────

    const renderField = (key: string, schema: VariableFieldSchema) => {
        let displayLabel = schema.label || key.replace(/_/g, ' ');
        if (isCarousel && !schema.label) {
            displayLabel = displayLabel.replace(/slide ?\d+/i, '').trim();
        }

        if (schema.type === 'array') {
            const items = Array.isArray(localValues[key]) ? localValues[key] : (localValues[key] ? [localValues[key]] : []);
            return (
                <div key={key} className="space-y-2 border rounded-xl p-4 bg-slate-50/50">
                    <Label className="text-sm font-semibold capitalize text-slate-800">{displayLabel}</Label>
                    {schema.description && <p className="text-[10px] text-muted-foreground">{schema.description}</p>}
                    <div className="space-y-3 mt-2">
                        {items.map((val: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                                <div className="flex-1">
                                    {schema.itemSchema?.type === 'textarea' ? (
                                        <Textarea
                                            value={val}
                                            onChange={(e) => handleArrayItemChange(key, idx, e.target.value)}
                                            className="min-h-[60px] resize-none text-sm bg-white"
                                            placeholder={`Item ${idx + 1}`}
                                        />
                                    ) : schema.itemSchema?.type === 'image' || key.toLowerCase().includes('image') || key.toLowerCase().includes('logo') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('icon') ? (
                                        <ImageVariablePicker
                                            value={val}
                                            onChange={(newVal) => handleArrayItemChange(key, idx, newVal)}
                                            schema={schema.itemSchema || {}}
                                        />
                                    ) : (
                                        <Input
                                            type="text"
                                            value={val}
                                            onChange={(e) => handleArrayItemChange(key, idx, e.target.value)}
                                            className="text-sm bg-white"
                                            placeholder={`Item ${idx + 1}`}
                                        />
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0 bg-white border"
                                    onClick={() => handleRemoveArrayItem(key, idx)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                            onClick={() => handleAddArrayItem(key)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add {displayLabel} Item
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div key={key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 capitalize">
                    {displayLabel}
                    {schema.required && <span className="text-red-400 text-xs">*</span>}
                </Label>

                {schema.type === 'textarea' ? (
                    <Textarea
                        value={localValues[key] || ''}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className="min-h-[72px] resize-none text-sm"
                        placeholder={schema.placeholder || schema.description}
                    />
                ) : schema.type === 'color' ? (
                    <div className="flex gap-2">
                        <div className="w-9 h-9 rounded-md border shadow-sm shrink-0 overflow-hidden">
                            <input
                                type="color"
                                value={localValues[key] || '#000000'}
                                onChange={(e) => handleValueChange(key, e.target.value)}
                                className="w-14 h-14 -m-2.5 cursor-pointer"
                            />
                        </div>
                        <Input
                            type="text"
                            value={localValues[key] || ''}
                            onChange={(e) => handleValueChange(key, e.target.value)}
                            className="font-mono text-sm uppercase"
                            placeholder="#HEXCOLOR"
                        />
                    </div>
                ) : schema.type === 'image' || key.toLowerCase().includes('image') || key.toLowerCase().includes('logo') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('icon') ? (
                    <ImageVariablePicker
                        value={localValues[key] || ''}
                        onChange={(newVal) => handleValueChange(key, newVal)}
                        schema={schema}
                    />
                ) : (
                    <Input
                        type="text"
                        value={localValues[key] || ''}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className="text-sm"
                        placeholder={schema.placeholder || schema.description}
                    />
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {template && (
                <DialogContent aria-describedby={undefined} className="max-w-[1400px] w-[95vw] p-0 overflow-hidden h-[95vh] flex flex-col bg-slate-50">
                    <DialogHeader className="px-6 py-3.5 bg-white border-b shrink-0 flex flex-row items-center justify-between z-20 shadow-sm">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Wand2 className="h-4.5 w-4.5 text-cyan-500" />
                            Editing: {template.name}
                        </DialogTitle>
                        <div className="flex gap-2 items-center">
                            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handlePreview}
                                disabled={isPreviewing}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                            >
                                {isPreviewing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Eye className="h-4 w-4 mr-2" />
                                )}
                                Preview & Render
                            </Button>
                            {previewUrls.length > 0 && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => handleDownload()} className="text-cyan-700 border-cyan-200 bg-cyan-50 hover:bg-cyan-100">
                                        <Download className="h-4 w-4 mr-2" />
                                        Download {pdfUrl ? 'PDF' : ''}
                                    </Button>

                                    {zipDownloadUrl && (
                                        <Button size="sm" variant="outline" onClick={() => handleDownload(zipDownloadUrl, true)} className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Images (ZIP)
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex flex-1 overflow-hidden">
                        {/* ── Left sidebar: Global Settings ─────────────────────────── */}
                        <div className="w-[300px] border-r bg-white flex flex-col shrink-0">
                            <div className="px-4 py-3 border-b bg-slate-50/50 shrink-0">
                                <h3 className="text-sm font-semibold text-slate-800">Global Settings</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Colors, fonts, and images</p>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-5">
                                    {globalVariables.map(([key, schema]) => renderField(key, schema))}
                                    {globalVariables.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">No global variables found.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* ── Middle: Slide Content ─────────────────────────────── */}
                        <div className="w-[360px] border-r bg-white flex flex-col shrink-0 drop-shadow-sm z-10">
                            <div className="px-4 py-3 border-b bg-slate-50/50 shrink-0 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        {isCarousel ? `Slide ${activeSlideIdx + 1}` : 'Content'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Editable text & images</p>
                                </div>
                                {isCarousel && slideCount > 1 && (
                                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md border">
                                        <Button
                                            variant="ghost" size="icon" className="h-6 w-6 rounded-sm bg-white shadow-sm disabled:bg-transparent disabled:shadow-none"
                                            disabled={activeSlideIdx === 0}
                                            onClick={() => setActiveSlideIdx(prev => prev - 1)}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-xs font-medium text-slate-600 px-1">
                                            {activeSlideIdx + 1} / {slideCount}
                                        </span>
                                        <Button
                                            variant="ghost" size="icon" className="h-6 w-6 rounded-sm bg-white shadow-sm disabled:bg-transparent disabled:shadow-none"
                                            disabled={activeSlideIdx === slideCount - 1}
                                            onClick={() => setActiveSlideIdx(prev => prev + 1)}
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <ScrollArea className="flex-1 bg-slate-50/30">
                                <div className="p-4 space-y-6">
                                    {/* Main content variables */}
                                    {contentVariables.map(([key, schema]) => renderField(key, schema))}

                                    {/* Carousel slide variables */}
                                    {isCarousel && currentSlideVariables.map(([key, schema]) => renderField(key, schema))}

                                    {(contentVariables.length === 0 && currentSlideVariables.length === 0) && (
                                        <div className="text-center py-10 border border-dashed rounded-xl bg-white">
                                            <p className="text-xs text-muted-foreground">No editable content for this slide.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* ── Right area: Live Preview ──────────────────────────── */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-slate-100/50">
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center">
                                <div className="w-full max-w-[500px]">
                                    {previewUrls.length > 0 ? (
                                        <img
                                            src={previewUrls[activeSlideIdx] || previewUrls[0]}
                                            alt={`Preview Slide ${activeSlideIdx + 1}`}
                                            className="w-full bg-white rounded-xl shadow-xl ring-1 ring-slate-200/50"
                                        />
                                    ) : (
                                        <div
                                            className="bg-white rounded-xl overflow-hidden shadow-xl ring-1 ring-slate-200/50 transition-all"
                                            style={{
                                                width: '100%',
                                                aspectRatio: `${template?.dimensions?.width || 1080} / ${template?.dimensions?.height || 1080}`,
                                            }}
                                        >
                                            <TemplatePreview
                                                type={template.type}
                                                htmlTemplate={template.html_template}
                                                previewUrl={null}
                                                slides={template.slides}
                                                defaultValues={localValues}
                                                dimensions={template?.dimensions || { width: 1080, height: 1080 }}
                                                activeSlideIndex={activeSlideIdx}
                                                className="w-full h-full pointer-events-none"
                                            />
                                        </div>
                                    )}

                                    {!previewUrls.length && (
                                        <p className="text-center text-xs text-muted-foreground mt-4 font-medium flex items-center justify-center gap-2">
                                            <Eye className="w-3.5 h-3.5" />
                                            Click "Preview & Render" to see full quality
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}
