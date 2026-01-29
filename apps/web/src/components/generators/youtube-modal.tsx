'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Youtube, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector, GOALS } from './goal-selector';

interface YouTubeModalProps {
    open: boolean;
    onClose: () => void;
}

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;

type Step = 'input' | 'template';

export function YouTubeModal({ open, onClose }: YouTubeModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [goal, setGoal] = useState('educate');  // Default for YouTube is usually educational
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isValidUrl = YOUTUBE_URL_REGEX.test(youtubeUrl);

    const handleNext = () => {
        if (!youtubeUrl.trim() || !isValidUrl) {
            toast({ title: 'Please enter a valid YouTube URL', variant: 'destructive' });
            return;
        }
        setStep('template');
    };

    const handleBack = () => {
        setStep('input');
    };

    const handleSubmit = async () => {
        if (!currentProfile) {
            toast({ title: 'No profile selected', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            await generatorsApi.youtube({
                profile_id: currentProfile.id,
                youtube_url: youtubeUrl.trim(),
                template_id: selectedTemplateId,
            });

            toast({ title: 'Draft generated successfully!' });
            onClose();
            resetForm();
            router.push('/dashboard/inbox');
        } catch (error) {
            toast({
                title: 'Failed to generate draft',
                description: getErrorMessage(error),
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setStep('input');
        setYoutubeUrl('');
        setGoal('educate');
        setSelectedTemplateId(null);
    };

    const handleClose = () => {
        if (!isLoading) {
            resetForm();
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()} className="sm:max-w-5xl">
            <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === 'template' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleBack}
                                disabled={isLoading}
                                className="mr-1 h-8 w-8"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                            <Youtube className="w-4 h-4 text-rose-600" />
                        </div>
                        Generate from YouTube
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : '2'} of 2
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 'input' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="youtube-url">YouTube Video URL *</Label>
                                <Input
                                    id="youtube-url"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    disabled={isLoading}
                                />
                                {youtubeUrl && !isValidUrl && (
                                    <p className="text-xs text-red-500">
                                        Please enter a valid YouTube URL
                                    </p>
                                )}
                            </div>

                            <GoalSelector
                                value={goal}
                                onChange={setGoal}
                                disabled={isLoading}
                            />

                            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                                <p className="text-sm font-medium text-slate-700">How it works:</p>
                                <ol className="text-sm text-slate-500 space-y-1 list-decimal list-inside">
                                    <li>We extract the video transcript</li>
                                    <li>Our AI agents analyze the key points</li>
                                    <li>A LinkedIn post is generated in your voice</li>
                                </ol>
                            </div>

                            <p className="text-xs text-slate-500">
                                Note: The video must have captions enabled for transcript extraction.
                            </p>
                        </div>
                    )}

                    {step === 'template' && currentProfile && (
                        <TemplateSelector
                            profileId={currentProfile.id}
                            sourceType="youtube"
                            goal={goal}
                            selectedTemplateId={selectedTemplateId}
                            onSelect={setSelectedTemplateId}
                            disabled={isLoading}
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {step === 'input' ? (
                        <Button
                            onClick={handleNext}
                            disabled={!youtubeUrl.trim() || !isValidUrl}
                            className="bg-cyan-600 hover:bg-cyan-500"
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="bg-cyan-600 hover:bg-cyan-500"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Generate Draft
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
