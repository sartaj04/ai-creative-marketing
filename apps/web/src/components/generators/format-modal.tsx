'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector } from './goal-selector';

interface FormatModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'template';

export function FormatModal({ open, onClose }: FormatModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [content, setContent] = useState('');
    const [goal, setGoal] = useState('educate');  // Default for formatting
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const charCount = content.length;
    const isValidLength = charCount >= 50 && charCount <= 10000;

    const handleNext = () => {
        if (charCount < 50) {
            toast({ title: 'Please enter at least 50 characters', variant: 'destructive' });
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
            await generatorsApi.format({
                profile_id: currentProfile.id,
                content: content.trim(),
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
        setContent('');
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
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                        </div>
                        Format Your Content
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : '2'} of 2
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 'input' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="content">Your Raw Content *</Label>
                                    <span className={`text-xs ${charCount > 10000 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {charCount} / 10,000 characters
                                    </span>
                                </div>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Paste your rough notes, ideas, or draft content here...

Example:
- Had a great meeting today about AI in marketing
- Key insight: personalization is the future
- Companies using AI see 40% better engagement
- Need to balance automation with authenticity"
                                    disabled={isLoading}
                                    className="min-h-[200px] resize-none"
                                />
                                {content && charCount < 50 && (
                                    <p className="text-xs text-amber-600">
                                        Add more content ({50 - charCount} more characters needed)
                                    </p>
                                )}
                            </div>

                            <GoalSelector
                                value={goal}
                                onChange={setGoal}
                                disabled={isLoading}
                            />

                            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                                <p className="text-sm font-medium text-slate-700">What our AI agents will do:</p>
                                <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                                    <li>Structure your content into a clear narrative</li>
                                    <li>Add a compelling hook to grab attention</li>
                                    <li>Format for optimal LinkedIn engagement</li>
                                    <li>Maintain your authentic voice throughout</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 'template' && currentProfile && (
                        <TemplateSelector
                            profileId={currentProfile.id}
                            sourceType="format"
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
                            disabled={!content.trim() || !isValidLength}
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
                            Format & Generate
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
