'use client';

import { useState } from 'react';
import { MediaAsset } from '@/lib/api/media';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Maximize2, Trash2, Image as ImageIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';

interface ImagePreviewProps {
    assets: MediaAsset[];
    onDelete?: (assetId: string) => void;
    compact?: boolean;
    className?: string;
}

export function ImagePreview({ assets, onDelete, compact = false, className }: ImagePreviewProps) {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    if (!assets || assets.length === 0) return null;

    // Single image
    if (assets.length === 1 && assets[0].type === 'image') {
        const asset = assets[0];
        return (
            <>
                <div className={cn('relative group rounded-lg overflow-hidden', className)}>
                    <img
                        src={asset.storage_url}
                        alt={asset.alt_text || 'Post image'}
                        className={cn(
                            'w-full object-cover',
                            compact ? 'h-32' : 'h-48'
                        )}
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white text-slate-700"
                            onClick={() => setLightboxUrl(asset.storage_url)}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                        {onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-red-50 text-red-600"
                                onClick={() => onDelete(asset.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Lightbox */}
                <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
                    <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
                        <button
                            onClick={() => setLightboxUrl(null)}
                            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        {lightboxUrl && (
                            <img
                                src={lightboxUrl}
                                alt="Full view"
                                className="w-full h-auto max-h-[85vh] object-contain"
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Multiple images / carousel slides
    const sorted = [...assets].sort((a, b) => (a.slide_index ?? 0) - (b.slide_index ?? 0));
    return (
        <div className={cn('flex gap-1 overflow-x-auto', className)}>
            {sorted.map((asset) => (
                <div
                    key={asset.id}
                    className="relative group flex-shrink-0 rounded-md overflow-hidden cursor-pointer"
                    onClick={() => setLightboxUrl(asset.storage_url)}
                >
                    <img
                        src={asset.storage_url}
                        alt={asset.alt_text || `Slide ${(asset.slide_index ?? 0) + 1}`}
                        className={cn(
                            'object-cover',
                            compact ? 'h-20 w-20' : 'h-28 w-28'
                        )}
                        loading="lazy"
                    />
                    {asset.slide_index !== null && (
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {asset.slide_index + 1}
                        </span>
                    )}
                </div>
            ))}

            {/* Lightbox */}
            <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
                <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    {lightboxUrl && (
                        <img
                            src={lightboxUrl}
                            alt="Full view"
                            className="w-full h-auto max-h-[85vh] object-contain"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
