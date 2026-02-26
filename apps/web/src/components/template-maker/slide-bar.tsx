'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Copy, Trash2, GripVertical } from 'lucide-react';

export interface SlideData {
    id: string;
    json: object;
    thumbnail?: string;
}

interface SlideBarProps {
    slides: SlideData[];
    currentSlideIndex: number;
    onSelectSlide: (index: number) => void;
    onAddSlide: () => void;
    onDeleteSlide: (index: number) => void;
    onDuplicateSlide: (index: number) => void;
    disabled?: boolean;
}

export function SlideBar({
    slides,
    currentSlideIndex,
    onSelectSlide,
    onAddSlide,
    onDeleteSlide,
    onDuplicateSlide,
    disabled,
}: SlideBarProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <div className="h-24 bg-white border-t border-slate-200 flex items-center px-4 gap-2 overflow-x-auto shrink-0">
            <span className="text-xs text-muted-foreground font-medium mr-2 shrink-0">
                Slides ({slides.length})
            </span>

            {slides.map((slide, idx) => (
                <div
                    key={slide.id}
                    className="relative group shrink-0"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                >
                    <button
                        onClick={() => onSelectSlide(idx)}
                        disabled={disabled}
                        className={cn(
                            'w-14 h-16 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all',
                            idx === currentSlideIndex
                                ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300',
                            disabled && 'opacity-50'
                        )}
                    >
                        {slide.thumbnail ? (
                            <img
                                src={slide.thumbnail}
                                alt={`Slide ${idx + 1}`}
                                className="w-full h-full object-cover rounded-md"
                            />
                        ) : (
                            idx + 1
                        )}
                    </button>

                    {/* Slide actions on hover */}
                    {hoveredIdx === idx && slides.length > 1 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex gap-0.5 bg-white shadow-md rounded border border-slate-200 p-0.5">
                            <button
                                className="p-1 hover:bg-cyan-50 rounded transition-colors"
                                onClick={(e) => { e.stopPropagation(); onDuplicateSlide(idx); }}
                                title="Duplicate"
                            >
                                <Copy className="h-3 w-3 text-slate-500" />
                            </button>
                            <button
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                onClick={(e) => { e.stopPropagation(); onDeleteSlide(idx); }}
                                title="Delete"
                            >
                                <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                        </div>
                    )}
                </div>
            ))}

            {/* Add slide button */}
            <button
                onClick={onAddSlide}
                disabled={disabled || slides.length >= 15}
                className={cn(
                    'w-14 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center',
                    'hover:border-cyan-400 hover:bg-cyan-50/50 transition-all shrink-0',
                    (disabled || slides.length >= 15) && 'opacity-40 cursor-not-allowed'
                )}
            >
                <Plus className="h-4 w-4 text-slate-400" />
            </button>
        </div>
    );
}
