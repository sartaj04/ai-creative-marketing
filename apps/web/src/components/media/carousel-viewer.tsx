'use client';

import { useState } from 'react';
import { MediaAsset } from '@/lib/api/media';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';

interface CarouselViewerProps {
    slides: MediaAsset[];
    slideTexts?: { title: string; body: string }[];
    className?: string;
    compact?: boolean;
}

export function CarouselViewer({ slides, slideTexts, className, compact = false }: CarouselViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const sorted = [...slides].sort((a, b) => (a.slide_index ?? 0) - (b.slide_index ?? 0));

    if (sorted.length === 0) return null;

    const goTo = (index: number) => {
        setCurrentIndex(Math.max(0, Math.min(index, sorted.length - 1)));
    };

    const currentSlide = sorted[currentIndex];
    const currentText = slideTexts?.[currentIndex];

    const SlideContent = ({ fullscreen = false }: { fullscreen?: boolean }) => (
        <div className={cn('relative select-none', fullscreen ? 'h-full' : '')}>
            {/* Image */}
            <div className={cn(
                'relative bg-slate-100 rounded-lg overflow-hidden',
                fullscreen ? 'h-[70vh]' : compact ? 'h-48' : 'h-80'
            )}>
                <img
                    src={currentSlide.storage_url}
                    alt={currentSlide.alt_text || `Slide ${currentIndex + 1}`}
                    className="w-full h-full object-contain"
                />

                {/* Navigation arrows */}
                {sorted.length > 1 && (
                    <>
                        <button
                            onClick={() => goTo(currentIndex - 1)}
                            className={cn(
                                'absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-opacity',
                                currentIndex === 0 && 'opacity-30 pointer-events-none'
                            )}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => goTo(currentIndex + 1)}
                            className={cn(
                                'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-opacity',
                                currentIndex === sorted.length - 1 && 'opacity-30 pointer-events-none'
                            )}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </>
                )}

                {/* Fullscreen toggle */}
                {!fullscreen && (
                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-white shadow-sm"
                    >
                        <Maximize2 className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Dot indicators */}
            {sorted.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                    {sorted.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goTo(idx)}
                            className={cn(
                                'w-2 h-2 rounded-full transition-all',
                                idx === currentIndex
                                    ? 'bg-cyan-600 w-4'
                                    : 'bg-slate-300 hover:bg-slate-400'
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Slide counter */}
            <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} / {sorted.length}
                </span>
            </div>

            {/* Slide text */}
            {currentText && !compact && (
                <div className="mt-3 space-y-1">
                    <h4 className="text-sm font-semibold">{currentText.title}</h4>
                    <p className="text-xs text-muted-foreground">{currentText.body}</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <div className={className}>
                <SlideContent />
            </div>

            {/* Fullscreen dialog */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-5xl p-6">
                    <SlideContent fullscreen />
                </DialogContent>
            </Dialog>
        </>
    );
}
