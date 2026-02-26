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
import { Badge } from '@/components/ui/badge';
import {
    Sparkles, Loader2, Image as ImageIcon, Type, Palette,
    Trash2, Undo2, ChevronLeft, ChevronRight, LayoutTemplate,
    AlignLeft, Settings2, Code2, Wand2,
} from 'lucide-react';
import type { VisualTemplateDraft, VisualTemplate, VariableFieldSchema } from '@/lib/api/visual-templates';
import { TemplatePreview } from '@/components/media/template-preview';
import { cn } from '@/lib/utils';

interface TemplateDraftReviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: VisualTemplateDraft | VisualTemplate | null;
    isSaving: boolean;
    onSave: (updatedDraft: VisualTemplateDraft | VisualTemplate) => void;
    onDiscard: () => void;
}

const SECTION_ORDER = ['Colors', 'Typography', 'Content', 'Layout', 'Images'] as const;
type SectionName = typeof SECTION_ORDER[number] | string;

const SECTION_ICONS: Record<string, React.ReactNode> = {
    Colors: <Palette className="h-3.5 w-3.5" />,
    Typography: <Type className="h-3.5 w-3.5" />,
    Content: <AlignLeft className="h-3.5 w-3.5" />,
    Layout: <Settings2 className="h-3.5 w-3.5" />,
    Images: <ImageIcon className="h-3.5 w-3.5" />,
};

function inferSection(type: string): SectionName {
    if (type === 'color') return 'Colors';
    if (type === 'image') return 'Images';
    if (type === 'number' || type === 'select') return 'Typography';
    return 'Content';
}



export function TemplateDraftReviewModal({
    open,
    onOpenChange,
    draft,
    isSaving,
    onSave,
    onDiscard,
}: TemplateDraftReviewModalProps) {
    const [localValues, setLocalValues] = useState<Record<string, string>>({});
    const [deletedVariables, setDeletedVariables] = useState<Set<string>>(new Set());
    const [deletedSlides, setDeletedSlides] = useState<Set<number>>(new Set());
    const [activeSlideIdx, setActiveSlideIdx] = useState(0);

    // Mutable copies of HTML
    const [editedHtmlTemplate, setEditedHtmlTemplate] = useState<string>('');
    const [editedSlides, setEditedSlides] = useState<Array<{ html_structure: string; variable_schema: Record<string, VariableFieldSchema>; default_values: Record<string, string> }>>([]);

    const isCarousel = draft?.type === 'carousel';

    // Reset everything when draft changes
    useEffect(() => {
        if (open && draft) {
            setLocalValues({ ...(draft.default_values || {}) });
            setDeletedVariables(new Set());
            setDeletedSlides(new Set());
            setActiveSlideIdx(0);
            setEditedHtmlTemplate(draft.html_template || '');
            setEditedSlides(draft.slides ? [...draft.slides] : []);
        } else {
            setLocalValues({});
            setDeletedVariables(new Set());
            setDeletedSlides(new Set());
            setActiveSlideIdx(0);
            setEditedHtmlTemplate('');
            setEditedSlides([]);
        }
    }, [open, draft]);

    const visibleSlides = editedSlides.map((slide, originalIndex) => ({
        slide,
        originalIndex
    })).filter(({ originalIndex }) => !deletedSlides.has(originalIndex));

    const visibleSlideCount = isCarousel ? visibleSlides.length : (draft?.slide_count || 1);

    // Wait until draft is available to fetch views



    // ── Variable handlers ────────────────────────────────────────────────

    const handleValueChange = (key: string, value: string) => {
        setLocalValues(prev => ({ ...prev, [key]: value }));
    };

    const handleToggleDelete = (key: string) => {
        setDeletedVariables(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // ── Save ─────────────────────────────────────────────────────────────

    const handleSave = () => {
        if (!draft) return;
        const newSchema = { ...(draft.variables_schema || {}) };
        const newDefaults = { ...localValues };

        Object.keys(newSchema).forEach(key => {
            if (deletedVariables.has(key)) {
                delete newSchema[key];
                delete newDefaults[key];
                return;
            }
            const match = key.match(/_slide(\d+)$/i);
            if (match) {
                const slideNum = parseInt(match[1], 10);
                if (deletedSlides.has(slideNum - 1)) {
                    delete newSchema[key];
                    delete newDefaults[key];
                }
            }
        });

        const filteredSlides = editedSlides.filter((_, idx) => !deletedSlides.has(idx));

        onSave({
            ...draft,
            html_template: editedHtmlTemplate,
            variables_schema: newSchema,
            default_values: newDefaults,
            slides: isCarousel ? filteredSlides : (draft?.slides || []),
            slide_count: isCarousel ? filteredSlides.length : (draft?.slide_count || 1),
        } as VisualTemplateDraft | VisualTemplate);
    };

    // ── Preview values (substituted into the live preview) ──────────────

    const previewValues = { ...localValues };
    deletedVariables.forEach(key => { previewValues[key] = ''; });

    // ── Merged variable schema (draft + extracted) ───────────────────────

    const variables = Object.entries(draft?.variables_schema || {});

    const sortedVariables = [...variables].sort((a, b) => {
        const sectionA = a[1].section || inferSection(a[1].type);
        const sectionB = b[1].section || inferSection(b[1].type);
        const orderA = SECTION_ORDER.indexOf(sectionA as typeof SECTION_ORDER[number]);
        const orderB = SECTION_ORDER.indexOf(sectionB as typeof SECTION_ORDER[number]);
        const diff = (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
        if (diff !== 0) return diff;
        return (a[1].required ? 0 : 1) - (b[1].required ? 0 : 1);
    });

    let globalVariables = sortedVariables;
    let currentSlideVariables: typeof sortedVariables = [];

    if (isCarousel) {
        globalVariables = sortedVariables.filter(([key]) => !/_slide\d+$/i.test(key));
        if (visibleSlides[activeSlideIdx]) {
            const originalIdx = visibleSlides[activeSlideIdx].originalIndex;
            currentSlideVariables = sortedVariables.filter(([key]) =>
                new RegExp(`_slide${originalIdx + 1}$`, 'i').test(key)
            );
        }
    }

    // ── Field renderers ──────────────────────────────────────────────────

    const renderField = (key: string, schema: VariableFieldSchema) => {
        let displayLabel = schema.label || key.replace(/_/g, ' ');
        if (isCarousel && !schema.label) {
            displayLabel = displayLabel.replace(/ slide\d+$/i, '');
        }
        const isDeleted = deletedVariables.has(key);

        return (
            <div key={key} className={cn("space-y-1.5 transition-opacity", isDeleted ? "opacity-40" : "")}>
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 capitalize">
                        {displayLabel}
                        {schema.required && <span className="text-red-400 text-xs">*</span>}
                        {schema.unit && (
                            <span className="text-xs text-slate-400 font-normal normal-case">({schema.unit})</span>
                        )}
                    </Label>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6 shrink-0", isDeleted ? "text-slate-500 hover:text-slate-700" : "text-slate-300 hover:text-red-500")}
                        onClick={() => handleToggleDelete(key)}
                        title={isDeleted ? "Restore field" : "Remove field"}
                    >
                        {isDeleted ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                </div>

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
                ) : schema.type === 'select' ? (
                    <select
                        value={localValues[key] || schema.options?.[0] || ''}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {(schema.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : schema.type === 'number' ? (
                    <div className="space-y-1">
                        {(schema.min != null && schema.max != null) ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={schema.min}
                                    max={schema.max}
                                    step={schema.step ?? 1}
                                    value={parseFloat(localValues[key] || String(schema.min || 0)) || 0}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    className="flex-1 cursor-pointer accent-violet-600 h-1.5"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                    <Input
                                        type="number"
                                        min={schema.min}
                                        max={schema.max}
                                        step={schema.step ?? 'any'}
                                        value={localValues[key] || ''}
                                        onChange={(e) => handleValueChange(key, e.target.value)}
                                        className="text-sm font-mono w-20 h-8"
                                        placeholder={schema.placeholder || String(schema.min ?? 0)}
                                    />
                                    {schema.unit && schema.unit !== 'ratio' && (
                                        <span className="text-xs text-muted-foreground w-6 shrink-0">{schema.unit}</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    step={schema.step ?? 'any'}
                                    value={localValues[key] || ''}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    className="text-sm font-mono w-24"
                                    placeholder={schema.placeholder || 'e.g. 48'}
                                />
                                {schema.unit && schema.unit !== 'ratio' && (
                                    <span className="text-xs text-muted-foreground">{schema.unit}</span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <Input
                        type="text"
                        value={localValues[key] || ''}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className="text-sm"
                        placeholder={schema.placeholder || schema.description}
                    />
                )}
                {schema.description && (
                    <p className="text-[10px] text-muted-foreground leading-tight">{schema.description}</p>
                )}
            </div>
        );
    };

    const groupVariables = (vars: [string, VariableFieldSchema][]) => {
        const groups: Record<string, [string, VariableFieldSchema][]> = {};
        for (const entry of vars) {
            const section = entry[1].section || inferSection(entry[1].type);
            if (!groups[section]) groups[section] = [];
            groups[section].push(entry);
        }
        return groups;
    };

    const renderVariableGroup = (vars: [string, VariableFieldSchema][]) => {
        const groups = groupVariables(vars);
        const orderedSections = [
            ...SECTION_ORDER.filter(s => groups[s]?.length),
            ...Object.keys(groups).filter(s => !SECTION_ORDER.includes(s as typeof SECTION_ORDER[number]) && groups[s]?.length),
        ];

        if (orderedSections.length === 0) return (
            <div className="text-center py-8 text-muted-foreground text-sm">No editable variables.</div>
        );

        return (
            <div className="space-y-5">
                {orderedSections.map(section => (
                    <div key={section}>
                        <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-slate-200">
                            <span className="text-slate-400">{SECTION_ICONS[section] || <Settings2 className="h-3.5 w-3.5" />}</span>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{section}</h4>
                        </div>
                        <div className="space-y-4">
                            {groups[section].map(([key, schema]) => renderField(key, schema))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ── Extraction panel ─────────────────────────────────────────────────



    // ── Render ───────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {draft && (
                <DialogContent aria-describedby={undefined} className="max-w-[1400px] w-[95vw] p-0 overflow-hidden h-[95vh] flex flex-col bg-slate-50">
                    <DialogHeader className="px-6 py-3.5 bg-white border-b shrink-0 flex flex-row items-center justify-between z-20 shadow-sm">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Sparkles className="h-4.5 w-4.5 text-violet-500" />
                            Review Draft: {draft.name}
                        </DialogTitle>
                        <div className="flex gap-2 items-center">
                            <Button variant="outline" size="sm" onClick={onDiscard} disabled={isSaving}>
                                Discard
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Save & Approve
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex flex-1 overflow-hidden">
                        {/* ── Left sidebar: Variables ─────────────────────────── */}
                        <div className="w-[300px] border-r bg-white flex flex-col shrink-0">
                            <div className="px-4 py-2.5 border-b bg-slate-50/50 shrink-0">
                                <p className="text-xs text-muted-foreground font-medium">
                                    {isCarousel ? 'Global Settings' : 'Template Settings'}
                                </p>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4">
                                    {renderVariableGroup(globalVariables)}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* ── Main area ───────────────────────────────────────── */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start">

                                    {/* Slide-specific variables (carousel only) */}
                                    {isCarousel && (
                                        <div className="w-full lg:w-[300px] shrink-0 bg-white rounded-xl border p-4 lg:sticky lg:top-0">
                                            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                                <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
                                                <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                                    Slide {activeSlideIdx + 1} Content
                                                </h2>
                                            </div>
                                            {currentSlideVariables.length > 0
                                                ? renderVariableGroup(currentSlideVariables)
                                                : (
                                                    <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg bg-slate-50">
                                                        No slide-specific variables.
                                                    </div>
                                                )
                                            }
                                        </div>
                                    )}

                                    {/* Live Preview */}
                                    <div className={cn("flex-1 w-full max-w-[560px] mx-auto", !isCarousel && "mt-6")}>
                                        <div
                                            className="bg-white rounded-xl overflow-hidden shadow-xl ring-1 ring-slate-200 mx-auto"
                                            style={{
                                                width: '100%',
                                                aspectRatio: `${draft?.dimensions?.width || 1080} / ${draft?.dimensions?.height || 1080}`,
                                            }}
                                        >
                                            <TemplatePreview
                                                htmlTemplate={editedHtmlTemplate}
                                                previewUrl={null}
                                                slides={visibleSlides.map(v => v.slide)}
                                                defaultValues={previewValues}
                                                dimensions={draft?.dimensions || { width: 1080, height: 1080 }}
                                                type={draft?.type || 'graphic'}
                                                slideCount={visibleSlideCount}
                                                variant="full"
                                                interactive={false}
                                                activeSlideIndex={activeSlideIdx}
                                                className="w-full h-full"
                                            />
                                        </div>

                                        {/* Carousel controls */}
                                        {isCarousel && visibleSlideCount > 0 && (
                                            <div className="mt-6 flex flex-col items-center gap-3">
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-9 h-9 rounded-full"
                                                        disabled={activeSlideIdx === 0}
                                                        onClick={() => setActiveSlideIdx(prev => prev - 1)}
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </Button>
                                                    <span className="text-sm font-medium text-slate-600 min-w-[90px] text-center">
                                                        Slide {activeSlideIdx + 1} / {visibleSlideCount}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-9 h-9 rounded-full"
                                                        disabled={activeSlideIdx === visibleSlideCount - 1}
                                                        onClick={() => setActiveSlideIdx(prev => prev + 1)}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                {visibleSlideCount > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                                                        onClick={() => {
                                                            if (visibleSlides[activeSlideIdx]) {
                                                                const originalIdx = visibleSlides[activeSlideIdx].originalIndex;
                                                                setDeletedSlides(prev => {
                                                                    const next = new Set(prev);
                                                                    next.add(originalIdx);
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                                        Delete Slide
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}
