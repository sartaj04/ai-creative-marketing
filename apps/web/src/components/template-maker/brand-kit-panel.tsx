'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useProfileStore } from '@/stores/profile-store';
import { Palette, Type as TypeIcon } from 'lucide-react';

interface BrandKitPanelProps {
    onApplyColor: (color: string) => void;
    onApplyFont: (font: string) => void;
}

const DEFAULT_BRAND_COLORS = [
    '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#0f172a', '#1e293b', '#ffffff', '#f1f5f9',
];

const DEFAULT_FONTS = [
    'Inter', 'Roboto', 'Outfit', 'Montserrat', 'Poppins',
];

export function BrandKitPanel({ onApplyColor, onApplyFont }: BrandKitPanelProps) {
    const { currentProfile } = useProfileStore();
    const [brandColors, setBrandColors] = useState<string[]>(DEFAULT_BRAND_COLORS);
    const [brandFonts, setBrandFonts] = useState<string[]>(DEFAULT_FONTS);

    // Try to extract brand colors/fonts from identity graph
    useEffect(() => {
        if (currentProfile) {
            // If the profile has brand colors in identity, use them
            // This is a stub — in production, extract from identity_graph.brand_colors
            const identity = (currentProfile as any).identity_graph;
            if (identity?.brand_colors && Array.isArray(identity.brand_colors)) {
                setBrandColors([...identity.brand_colors, ...DEFAULT_BRAND_COLORS.slice(identity.brand_colors.length)]);
            }
            if (identity?.brand_fonts && Array.isArray(identity.brand_fonts)) {
                setBrandFonts([...identity.brand_fonts, ...DEFAULT_FONTS.slice(identity.brand_fonts.length)]);
            }
        }
    }, [currentProfile]);

    return (
        <div className="space-y-4 p-3 border-t border-slate-100">
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <Palette className="h-3.5 w-3.5 text-cyan-600" />
                    <Label className="text-xs font-semibold text-slate-600">Brand Colors</Label>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {brandColors.map((color, i) => (
                        <button
                            key={`${color}-${i}`}
                            className="w-full aspect-square rounded-md border border-slate-200 hover:scale-110 hover:ring-2 hover:ring-cyan-300 transition-all shadow-sm"
                            style={{ background: color }}
                            title={color}
                            onClick={() => onApplyColor(color)}
                        />
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <TypeIcon className="h-3.5 w-3.5 text-cyan-600" />
                    <Label className="text-xs font-semibold text-slate-600">Brand Fonts</Label>
                </div>
                <div className="space-y-1">
                    {brandFonts.map((font) => (
                        <button
                            key={font}
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                            style={{ fontFamily: font }}
                            onClick={() => onApplyFont(font)}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
