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
import { Loader2, PenLine, Plus, X, ChevronLeft, ChevronRight, Check, RefreshCw, Sparkles } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { draftsApi } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector, GOALS } from './goal-selector';
import ReactMarkdown from 'react-markdown';

interface ScratchModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'template' | 'review';

export function ScratchModal({ open, onClose }: ScratchModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [topic, setTopic] = useState('');
    const [keyPoints, setKeyPoints] = useState<string[]>(['']);
    const [goal, setGoal] = useState('thought_leadership');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedDraft, setGeneratedDraft] = useState<{
        draft_id: string;
        hook: string;
        body: string;
        topic: string | null;
        confidence: number;
    } | null>(null);

    const handleAddKeyPoint = () => {
        if (keyPoints.length < 5) {
            setKeyPoints([...keyPoints, '']);
        }
    };

    const handleRemoveKeyPoint = (index: number) => {
        if (keyPoints.length > 1) {
            setKeyPoints(keyPoints.filter((_, i) => i !== index));
        }
    };

    const handleKeyPointChange = (index: number, value: string) => {
        const newKeyPoints = [...keyPoints];
        newKeyPoints[index] = value;
        setKeyPoints(newKeyPoints);
    };

    const handleNext = () => {
        if (!topic.trim()) {
            toast({ title: 'Please enter a topic', variant: 'destructive' });
            return;
        }
        setStep('template');
    };

    const handleBack = () => {
        if (step === 'review') {
            setStep('template');
        } else {
            setStep('input');
        }
    };

    const handleGenerate = async () => {
        if (!currentProfile) {
            toast({ title: 'No profile selected', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const filteredKeyPoints = keyPoints.filter(kp => kp.trim());
            const response = await generatorsApi.scratch({
                profile_id: currentProfile.id,
                topic: topic.trim(),
                key_points: filteredKeyPoints,
                goal: goal,
                template_id: selectedTemplateId,
            });

            setGeneratedDraft(response);
            setStep('review');
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

    const handleApprove = async () => {
        if (!generatedDraft) return;
        setIsLoading(true);
        try {
            await draftsApi.action(generatedDraft.draft_id, { action: 'approve' });
            toast({ title: 'Draft approved and moved to kanban!' });
            onClose();
            resetForm();
            router.push('/dashboard/drafts');
        } catch (error) {
            toast({
                title: 'Failed to approve',
                description: getErrorMessage(error),
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerate = () => {
        setGeneratedDraft(null);
        setStep('template');
    };

    const resetForm = () => {
        setStep('input');
        setTopic('');
        setKeyPoints(['']);
        setGoal('thought_leadership');
        setSelectedTemplateId(null);
        setGeneratedDraft(null);
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
                        {(step === 'template' || step === 'review') && (
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
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <PenLine className="w-4 h-4 text-blue-600" />
                        </div>
                        Generate from Scratch
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : step === 'template' ? '2' : '3'} of 3
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 'input' && (
                        <div className="space-y-4">
                            {/* Topic */}
                            <div className="space-y-2">
                                <Label htmlFor="topic">Topic *</Label>
                                <Input
                                    id="topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., The future of AI in marketing"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Key Points */}
                            <div className="space-y-2">
                                <Label>Key Points (optional)</Label>
                                <div className="space-y-2">
                                    {keyPoints.map((point, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={point}
                                                onChange={(e) => handleKeyPointChange(index, e.target.value)}
                                                placeholder={`Key point ${index + 1}`}
                                                disabled={isLoading}
                                            />
                                            {keyPoints.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveKeyPoint(index)}
                                                    disabled={isLoading}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {keyPoints.length < 5 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddKeyPoint}
                                        disabled={isLoading}
                                        className="mt-2"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Key Point
                                    </Button>
                                )}
                            </div>

                            {/* Goal */}
                            <GoalSelector
                                value={goal}
                                onChange={setGoal}
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    {step === 'template' && currentProfile && (
                        <TemplateSelector
                            profileId={currentProfile.id}
                            sourceType="scratch"
                            topicHint={topic}
                            goal={goal}
                            selectedTemplateId={selectedTemplateId}
                            onSelect={setSelectedTemplateId}
                            disabled={isLoading}
                        />
                    )}

                    {step === 'review' && generatedDraft && (
                        <div className="space-y-6">
                            {/* Confidence Badge */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-100">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{generatedDraft.topic || 'Your Draft'}</h3>
                                    <p className="text-xs text-slate-500 mt-1">Review your generated post</p>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg text-sm font-bold border bg-white border-cyan-200 text-cyan-700">
                                    <Sparkles className="w-4 h-4 inline mr-1" />
                                    {Math.round(generatedDraft.confidence * 100)}% Match
                                </div>
                            </div>

                            {/* Draft Content */}
                            <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200">
                                {generatedDraft.hook && (
                                    <div className="pb-6 border-b border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Hook</p>
                                        <p className="text-slate-900 leading-relaxed text-xl font-bold">
                                            {generatedDraft.hook}
                                        </p>
                                    </div>
                                )}
                                {generatedDraft.body && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Content</p>
                                        <div className="text-slate-600 leading-relaxed prose prose-slate max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                                                    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                                                    ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2">{children}</ul>,
                                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                }}
                                            >
                                                {generatedDraft.body}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {step === 'input' && (
                        <Button
                            onClick={handleNext}
                            disabled={!topic.trim()}
                            className="bg-cyan-600 hover:bg-cyan-500"
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                    {step === 'template' && (
                        <Button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="bg-cyan-600 hover:bg-cyan-500"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Generate Draft
                        </Button>
                    )}
                    {step === 'review' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleRegenerate}
                                disabled={isLoading}
                                className="border-slate-300 hover:border-cyan-300"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Regenerate
                            </Button>
                            <Button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                Approve & Move to Kanban
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
