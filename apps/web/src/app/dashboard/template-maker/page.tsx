'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as fabric from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useProfileStore } from '@/stores/profile-store';
import {
    Save, Undo2, Redo2, Download,
    ArrowLeft, Layers3,
} from 'lucide-react';

import { CanvasEditor, type CanvasEditorRef } from '@/components/template-maker/canvas-editor';
import { ElementToolbox } from '@/components/template-maker/element-toolbox';
import { PropertyPanel } from '@/components/template-maker/property-panel';
import { VariableBinder } from '@/components/template-maker/variable-binder';
import { SlideBar, type SlideData } from '@/components/template-maker/slide-bar';
import { BrandKitPanel } from '@/components/template-maker/brand-kit-panel';
import { visualTemplatesApi } from '@/lib/api/visual-templates';

const SIZE_PRESETS = [
    { label: 'Square (1080×1080)', value: '1080x1080', w: 1080, h: 1080 },
    { label: 'Portrait (1080×1350)', value: '1080x1350', w: 1080, h: 1350 },
    { label: 'Landscape (1200×628)', value: '1200x628', w: 1200, h: 628 },
    { label: 'Story (1080×1920)', value: '1080x1920', w: 1080, h: 1920 },
];

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

export default function TemplateMakerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { currentProfile } = useProfileStore();

    const canvasRef = useRef<CanvasEditorRef>(null);

    // Template metadata
    const [templateName, setTemplateName] = useState('Untitled Template');
    const [templateCategory, setTemplateCategory] = useState('quote');
    const [canvasWidth, setCanvasWidth] = useState(1080);
    const [canvasHeight, setCanvasHeight] = useState(1080);
    const [bgColor, setBgColor] = useState('#0f172a');
    const [saving, setSaving] = useState(false);

    // Canvas state
    const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
    const [bindTarget, setBindTarget] = useState<fabric.FabricObject | null>(null);
    const [showVariableBinder, setShowVariableBinder] = useState(false);

    // Carousel state
    const [isCarousel, setIsCarousel] = useState(false);
    const [slides, setSlides] = useState<SlideData[]>([{ id: generateId(), json: {} }]);
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

    // Load existing template if ?id= param
    const templateId = searchParams.get('id');
    useEffect(() => {
        if (!templateId) return;
        visualTemplatesApi.get(templateId).then((tmpl) => {
            setTemplateName(tmpl.name);
            setTemplateCategory(tmpl.category || 'quote');
            if (tmpl.dimensions) {
                setCanvasWidth(tmpl.dimensions.width || 1080);
                setCanvasHeight(tmpl.dimensions.height || 1080);
            }
            if (tmpl.type === 'carousel') {
                setIsCarousel(true);
                const canvasJson = tmpl.canvas_json;
                if (canvasJson && Array.isArray(canvasJson.slides)) {
                    const loadedSlides = canvasJson.slides.map((s: any) => ({
                        id: generateId(),
                        json: s,
                    }));
                    setSlides(loadedSlides);
                    if (loadedSlides.length > 0 && canvasRef.current) {
                        canvasRef.current.loadJSON(loadedSlides[0].json);
                    }
                }
            } else if (tmpl.canvas_json) {
                setTimeout(() => canvasRef.current?.loadJSON(tmpl.canvas_json as object), 500);
            }
        }).catch(() => {
            toast({ title: 'Failed to load template', variant: 'destructive' });
        });
    }, [templateId]);

    // Slide management
    const saveCurrentSlide = useCallback(() => {
        if (!canvasRef.current || !isCarousel) return;
        const json = canvasRef.current.exportJSON();
        setSlides((prev) => {
            const next = [...prev];
            next[currentSlideIdx] = { ...next[currentSlideIdx], json };
            return next;
        });
    }, [currentSlideIdx, isCarousel]);

    const handleSelectSlide = useCallback((idx: number) => {
        if (idx === currentSlideIdx) return;
        saveCurrentSlide();
        setCurrentSlideIdx(idx);
        const slideJson = slides[idx]?.json;
        if (slideJson && Object.keys(slideJson).length > 0) {
            canvasRef.current?.loadJSON(slideJson);
        } else {
            canvasRef.current?.loadJSON({ version: '6.0.0', objects: [], background: bgColor });
        }
    }, [currentSlideIdx, slides, bgColor, saveCurrentSlide]);

    const handleAddSlide = useCallback(() => {
        saveCurrentSlide();
        const newSlide = { id: generateId(), json: {} };
        setSlides((prev) => [...prev, newSlide]);
        const newIdx = slides.length;
        setCurrentSlideIdx(newIdx);
        canvasRef.current?.loadJSON({ version: '6.0.0', objects: [], background: bgColor });
    }, [slides, bgColor, saveCurrentSlide]);

    const handleDeleteSlide = useCallback((idx: number) => {
        if (slides.length <= 1) return;
        setSlides((prev) => prev.filter((_, i) => i !== idx));
        if (currentSlideIdx >= idx && currentSlideIdx > 0) {
            setCurrentSlideIdx(currentSlideIdx - 1);
        }
    }, [slides, currentSlideIdx]);

    const handleDuplicateSlide = useCallback((idx: number) => {
        saveCurrentSlide();
        const duplicated = { id: generateId(), json: JSON.parse(JSON.stringify(slides[idx].json)) };
        setSlides((prev) => {
            const next = [...prev];
            next.splice(idx + 1, 0, duplicated);
            return next;
        });
    }, [slides, saveCurrentSlide]);

    // Save template
    const handleSave = async () => {
        if (!currentProfile) {
            toast({ title: 'No profile selected', variant: 'destructive' });
            return;
        }
        if (!canvasRef.current) return;

        setSaving(true);
        try {
            saveCurrentSlide();

            let canvasJson: any;
            if (isCarousel) {
                const currentJson = canvasRef.current.exportJSON();
                const allSlides = slides.map((s, i) =>
                    i === currentSlideIdx ? currentJson : s.json
                );
                canvasJson = { slides: allSlides };
            } else {
                canvasJson = canvasRef.current.exportJSON();
            }

            // Extract variables from canvas objects
            const variables: Record<string, any> = {};
            const extractVars = (json: any) => {
                const objects = json?.objects || [];
                for (const obj of objects) {
                    if (obj.isVariable && obj.variableName) {
                        const isText = obj.type === 'textbox' || obj.type === 'i-text';
                        variables[obj.variableName] = {
                            type: isText ? 'text' : 'color',
                            default: isText ? obj.text : obj.fill,
                        };
                    }
                }
            };

            if (isCarousel) {
                canvasJson.slides.forEach((s: any) => extractVars(s));
            } else {
                extractVars(canvasJson);
            }

            const payload = {
                name: templateName,
                type: (isCarousel ? 'carousel' : 'image') as 'carousel' | 'image',
                category: templateCategory,
                canvas_json: canvasJson,
                variables_schema: variables,
                default_values: Object.fromEntries(
                    Object.entries(variables).map(([k, v]: [string, any]) => [k, v.default || ''])
                ),
                dimensions: { width: canvasWidth, height: canvasHeight },
                slide_count: isCarousel ? slides.length : undefined,
                tags: [templateCategory, isCarousel ? 'carousel' : 'image'],
            };

            if (templateId) {
                await visualTemplatesApi.update(templateId, payload);
                toast({ title: 'Template updated!' });
            } else {
                await visualTemplatesApi.create(payload);
                toast({ title: 'Template created!' });
            }

            router.push('/dashboard/template-maker');
        } catch (error: any) {
            toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleExportPNG = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.exportPNG();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${templateName.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
    };

    const handleApplyColor = (color: string) => {
        if (selectedObject && canvasRef.current?.canvas) {
            selectedObject.set({ fill: color });
            canvasRef.current.canvas.renderAll();
        }
    };

    const handleApplyFont = (font: string) => {
        if (selectedObject && selectedObject instanceof fabric.Textbox && canvasRef.current?.canvas) {
            selectedObject.set({ fontFamily: font });
            canvasRef.current.canvas.renderAll();
        }
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const [w, h] = e.target.value.split('x').map(Number);
        setCanvasWidth(w);
        setCanvasHeight(h);
        canvasRef.current?.setCanvasDimensions(w, h);
    };

    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col -m-4 sm:-m-6 md:-m-8">
            {/* Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="w-px h-5 bg-slate-200" />

                <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-7 w-48 text-sm font-medium border-0 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1"
                />

                <Select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="h-7 w-28 text-xs"
                >
                    {['quote', 'stat', 'tips', 'announcement', 'comparison', 'checklist', 'listicle', 'story'].map((c) => (
                        <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                </Select>

                <Select
                    value={`${canvasWidth}x${canvasHeight}`}
                    onChange={handleSizeChange}
                    className="h-7 w-44 text-xs"
                >
                    {SIZE_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </Select>

                <Button
                    variant={isCarousel ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setIsCarousel(!isCarousel)}
                >
                    <Layers3 className="h-3 w-3" />
                    Carousel
                </Button>

                <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-[10px] text-muted-foreground">BG</span>
                    <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-6 h-6 rounded border cursor-pointer"
                    />
                </div>

                <div className="flex-1" />

                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvasRef.current?.undo()} title="Undo">
                    <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvasRef.current?.redo()} title="Redo">
                    <Redo2 className="h-3.5 w-3.5" />
                </Button>

                <div className="w-px h-5 bg-slate-200" />

                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportPNG}>
                    <Download className="h-3 w-3" />
                    Export
                </Button>

                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                    <Save className="h-3 w-3" />
                    {saving ? 'Saving...' : 'Save Template'}
                </Button>
            </div>

            {/* Main editor area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: toolbox + brand kit */}
                <div className="flex flex-col">
                    <ElementToolbox
                        onAddText={() => canvasRef.current?.addText()}
                        onAddShape={(type) => canvasRef.current?.addShape(type)}
                        onAddImage={(url) => canvasRef.current?.addImage(url)}
                    />
                    <BrandKitPanel onApplyColor={handleApplyColor} onApplyFont={handleApplyFont} />
                </div>

                {/* Center: canvas */}
                <CanvasEditor
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    background={bgColor}
                    onSelectionChange={setSelectedObject}
                    onModified={() => { }}
                />

                {/* Right: properties */}
                <PropertyPanel
                    selectedObject={selectedObject}
                    canvas={canvasRef.current?.canvas || null}
                    onPropertyChange={() => { }}
                    onBindVariable={(obj) => {
                        setBindTarget(obj);
                        setShowVariableBinder(true);
                    }}
                    onDelete={() => canvasRef.current?.deleteSelected()}
                />
            </div>

            {/* Bottom: slide bar (carousel only) */}
            {isCarousel && (
                <SlideBar
                    slides={slides}
                    currentSlideIndex={currentSlideIdx}
                    onSelectSlide={handleSelectSlide}
                    onAddSlide={handleAddSlide}
                    onDeleteSlide={handleDeleteSlide}
                    onDuplicateSlide={handleDuplicateSlide}
                />
            )}

            <VariableBinder
                open={showVariableBinder}
                onOpenChange={setShowVariableBinder}
                targetObject={bindTarget}
                canvas={canvasRef.current?.canvas || null}
                onBound={() => setSelectedObject(selectedObject)}
            />
        </div>
    );
}
