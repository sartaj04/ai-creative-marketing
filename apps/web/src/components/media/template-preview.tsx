'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlideTemplate } from '@/lib/api/visual-templates';

export interface TemplatePreviewProps {
    htmlTemplate: string | null;
    previewUrl: string | null;
    /** Per-slide HTML definitions (carousel templates). Accepts both saved SlideTemplate and draft SlideTemplateCreate shapes. */
    slides?: Pick<SlideTemplate, 'html_structure' | 'default_values'>[];
    defaultValues: Record<string, string>;
    dimensions?: { width: number; height: number };
    /** Rendering context — affects future style hints */
    variant?: 'card' | 'modal' | 'full';
    type?: 'image' | 'carousel';
    /** Fallback slide count when slides[] not provided */
    slideCount?: number | null;
    /** Enable prev/next arrow navigation (carousel) */
    interactive?: boolean;
    className?: string;
    /** Controlled active slide index */
    activeSlideIndex?: number;
    /** Callback when slide changes (for controlled mode) */
    onSlideChange?: (index: number) => void;
}

function substituteVariables(html: string, values: Record<string, string>, slideIndex?: number): string {
    let result = html;

    // Replace slide-specific variables first (e.g., if rendering slide 2, prefer slide_2_headline over generic headline)
    const matches = result.match(/\{\{([^}]+)\}\}/g) || [];
    const uniqueKeys = Array.from(new Set(matches.map(m => m.replace(/[{{}}]/g, '').trim())));

    uniqueKeys.forEach(key => {
        // 1. Try slide-specific exact match if we are in a carousel context
        let val = typeof slideIndex === 'number' ? values[`slide_${slideIndex + 1}_${key}`] : undefined;
        // 2. Try generic match (for global variables or unstructured slide arrays)
        if (val === undefined) {
            val = values[key];
        }

        if (val !== undefined) {
            result = result.replace(
                new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
                String(val),
            );
        }
    });

    // Clear unreplaced placeholders
    return result.replace(/\{\{[^}]+\}\}/g, '');
}

export function TemplatePreview({
    htmlTemplate,
    previewUrl,
    slides,
    defaultValues,
    dimensions = { width: 1080, height: 1080 },
    variant: _variant = 'card',
    type,
    slideCount,
    interactive = false,
    className = '',
    activeSlideIndex,
    onSlideChange,
}: TemplatePreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [internalSlideIndex, setInternalSlideIndex] = useState(0);

    const currentSlideIndex = activeSlideIndex ?? internalSlideIndex;

    // Dynamically compute scale based on measured container size
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect || rect.width === 0 || rect.height === 0) return;
            setScale(Math.min(rect.width / dimensions.width, rect.height / dimensions.height));
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [dimensions.width, dimensions.height]);

    // Reset when template content changes
    useEffect(() => {
        if (activeSlideIndex === undefined) {
            setInternalSlideIndex(0);
        }
        setIsLoaded(false);
    }, [htmlTemplate, slides, activeSlideIndex]);

    // Resolve the active rendered HTML for the current slide
    const activeHtml = useMemo(() => {
        const hasSlides = slides && slides.length > 0;

        if (hasSlides) {
            const slide = slides[currentSlideIndex];
            if (!slide?.html_structure) return null;
            // Spread original slide defaults FIRST, then OVERRIDE with live user edits
            const values = { ...slide.default_values, ...defaultValues };
            return substituteVariables(slide.html_structure, values, currentSlideIndex);
        }

        if (htmlTemplate) {
            return substituteVariables(htmlTemplate, defaultValues, type === 'carousel' ? currentSlideIndex : undefined);
        }

        return null;
    }, [htmlTemplate, slides, currentSlideIndex, defaultValues, type]);

    const totalSlides = slides && slides.length > 0
        ? slides.length
        : (slideCount ?? 1);

    const canNavigate = interactive && totalSlides > 1;

    const goToPrev = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIdx = Math.max(0, currentSlideIndex - 1);
        if (activeSlideIndex === undefined) {
            setInternalSlideIndex(nextIdx);
        }
        onSlideChange?.(nextIdx);
    }, [currentSlideIndex, activeSlideIndex, onSlideChange]);

    const goToNext = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIdx = Math.min(totalSlides - 1, currentSlideIndex + 1);
        if (activeSlideIndex === undefined) {
            setInternalSlideIndex(nextIdx);
        }
        onSlideChange?.(nextIdx);
    }, [currentSlideIndex, totalSlides, activeSlideIndex, onSlideChange]);

    const goToSlide = useCallback((index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeSlideIndex === undefined) {
            setInternalSlideIndex(index);
        }
        onSlideChange?.(index);
    }, [activeSlideIndex, onSlideChange]);

    const hasContent = !!previewUrl || !!activeHtml;

    return (
        <div
            ref={containerRef}
            className={cn('relative w-full h-full overflow-hidden bg-slate-50', className)}
        >
            {/* ── Static image preview (fast path) ──────────────────── */}
            {previewUrl && (
                <img
                    src={previewUrl}
                    alt="Template preview"
                    className="absolute inset-0 w-full h-full object-contain"
                    loading="lazy"
                />
            )}

            {/* ── iframe HTML preview ────────────────────────────────── */}
            {!previewUrl && activeHtml && scale > 0 && (
                <>
                    {/* Loading shimmer */}
                    {!isLoaded && (
                        <div className="absolute inset-0 bg-slate-100 animate-pulse" />
                    )}
                    <iframe
                        // Key forces full remount when slide changes — ensures onLoad fires
                        key={currentSlideIndex}
                        srcDoc={activeHtml}
                        title="Template preview"
                        sandbox="allow-same-origin allow-scripts"
                        loading="lazy"
                        onLoad={() => setIsLoaded(true)}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: `${dimensions.width}px`,
                            height: `${dimensions.height}px`,
                            border: 'none',
                            pointerEvents: 'none',
                            transformOrigin: 'center center',
                            transform: `translate(-50%, -50%) scale(${scale})`,
                        }}
                    />
                </>
            )}

            {/* ── Fallback icon ──────────────────────────────────────── */}
            {!hasContent && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                </div>
            )}

            {/* ── Slide count badge (non-interactive carousels) ─────── */}
            {!interactive && type === 'carousel' && totalSlides > 1 && (
                <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-4 pointer-events-none">
                    {totalSlides} slides
                </div>
            )}

            {/* ── Carousel navigation (interactive mode) ────────────── */}
            {canNavigate && (
                <>
                    <button
                        onClick={goToPrev}
                        disabled={currentSlideIndex === 0}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-opacity"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="h-3.5 w-3.5 text-slate-700" />
                    </button>

                    <button
                        onClick={goToNext}
                        disabled={currentSlideIndex === totalSlides - 1}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-opacity"
                        aria-label="Next slide"
                    >
                        <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
                        {Array.from({ length: totalSlides }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToSlide(idx, e);
                                }}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={cn(
                                    'rounded-full bg-white transition-all duration-200',
                                    idx === currentSlideIndex
                                        ? 'w-4 h-1.5 opacity-100'
                                        : 'w-1.5 h-1.5 opacity-50',
                                )}
                            />
                        ))}
                    </div>

                    {/* Slide counter */}
                    <div className="absolute top-1.5 right-1.5 z-10 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-4 pointer-events-none">
                        {currentSlideIndex + 1} / {totalSlides}
                    </div>
                </>
            )}
        </div>
    );
}
