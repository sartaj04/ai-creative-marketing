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
import { Loader2, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector } from './goal-selector';

interface ArticleModalProps {
    open: boolean;
    onClose: () => void;
}

const URL_REGEX = /^https?:\/\/.+/;

type Step = 'input' | 'template';

export function ArticleModal({ open, onClose }: ArticleModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [articleUrl, setArticleUrl] = useState('');
    const [goal, setGoal] = useState('thought_leadership');  // Default for articles
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isValidUrl = URL_REGEX.test(articleUrl);

    const handleNext = () => {
        if (!articleUrl.trim() || !isValidUrl) {
            toast({ title: 'Please enter a valid URL', variant: 'destructive' });
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
            await generatorsApi.article({
                profile_id: currentProfile.id,
                article_url: articleUrl.trim(),
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
        setArticleUrl('');
        setGoal('thought_leadership');
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
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                            <Link2 className="w-4 h-4 text-green-600" />
                        </div>
                        Generate from Article
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : '2'} of 2
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 'input' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="article-url">Article URL *</Label>
                                <Input
                                    id="article-url"
                                    value={articleUrl}
                                    onChange={(e) => setArticleUrl(e.target.value)}
                                    placeholder="https://example.com/article..."
                                    disabled={isLoading}
                                />
                                {articleUrl && !isValidUrl && (
                                    <p className="text-xs text-red-500">
                                        Please enter a valid URL starting with http:// or https://
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
                                    <li>We fetch and extract the article content</li>
                                    <li>Our AI agents identify the key insights</li>
                                    <li>A LinkedIn post is generated with your perspective</li>
                                </ol>
                            </div>

                            <p className="text-xs text-slate-500">
                                Works best with blog posts, news articles, and long-form content.
                            </p>
                        </div>
                    )}

                    {step === 'template' && currentProfile && (
                        <TemplateSelector
                            profileId={currentProfile.id}
                            sourceType="article"
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
                            disabled={!articleUrl.trim() || !isValidUrl}
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
