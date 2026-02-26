'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { mediaApi, ImageGenerateRequest } from '@/lib/api/media';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface ImageGeneratorModalProps {
    open: boolean;
    onClose: () => void;
    draftId: string;
    draftContent?: string;
    onImageGenerated?: (imageUrl: string) => void;
}

const STYLES = [
    { value: 'professional', label: 'Professional', emoji: '💼', desc: 'Clean, corporate, polished' },
    { value: 'creative', label: 'Creative', emoji: '🎨', desc: 'Artistic, vibrant, dynamic' },
    { value: 'minimal', label: 'Minimal', emoji: '✨', desc: 'Clean lines, white space' },
    { value: 'bold', label: 'Bold', emoji: '⚡', desc: 'Strong contrast, impactful' },
    { value: 'abstract', label: 'Abstract', emoji: '🌀', desc: 'Geometric, patterns, gradients' },
];

export function ImageGeneratorModal({
    open,
    onClose,
    draftId,
    draftContent,
    onImageGenerated,
}: ImageGeneratorModalProps) {
    const { toast } = useToast();
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('professional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedUrl(null);
        try {
            const response = await mediaApi.generateImage({
                draft_id: draftId,
                prompt: prompt.trim() || null,
                style,
            });
            setGeneratedUrl(response.media_asset.storage_url);
            onImageGenerated?.(response.media_asset.storage_url);
            toast({ title: 'Image generated successfully!' });
        } catch (error) {
            toast({
                title: 'Generation failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        if (!isGenerating) {
            setPrompt('');
            setStyle('professional');
            setGeneratedUrl(null);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Wand2 className="w-4 h-4 text-purple-600" />
                        </div>
                        AI Image Generator
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Prompt */}
                    <div className="space-y-2">
                        <Label htmlFor="prompt">
                            Image Prompt
                            <span className="text-xs text-muted-foreground ml-2">
                                (leave blank to auto-generate from post content)
                            </span>
                        </Label>
                        <Textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Modern workspace with laptop showing data dashboard, warm lighting, plants"
                            className="min-h-[80px]"
                            disabled={isGenerating}
                        />
                    </div>

                    {/* Style selector */}
                    <div className="space-y-2">
                        <Label>Style</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {STYLES.map((s) => (
                                <button
                                    key={s.value}
                                    onClick={() => setStyle(s.value)}
                                    disabled={isGenerating}
                                    className={cn(
                                        'flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center',
                                        style === s.value
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    )}
                                >
                                    <span className="text-lg mb-1">{s.emoji}</span>
                                    <span className="text-xs font-medium">{s.label}</span>
                                    <span className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                                        {s.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview / Result */}
                    <div className="aspect-square max-h-[300px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center mx-auto w-[300px]">
                        {isGenerating ? (
                            <div className="text-center space-y-2">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
                                <p className="text-sm text-muted-foreground">Generating with Imagen 3...</p>
                            </div>
                        ) : generatedUrl ? (
                            <img
                                src={generatedUrl}
                                alt="Generated image"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="text-center space-y-2 px-6">
                                <Sparkles className="h-10 w-10 text-slate-300 mx-auto" />
                                <p className="text-xs text-muted-foreground">
                                    Your AI-generated image will appear here
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                        {generatedUrl ? 'Done' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        {generatedUrl ? 'Regenerate' : 'Generate Image'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
