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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, PenLine, Plus, X, ChevronLeft, ChevronRight, Check, RefreshCw, Sparkles, MessageSquare } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { draftsApi } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector, GOALS } from './goal-selector';
import { GeneratorReview, GeneratedDraft } from './generator-review';

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
    const [usePersona, setUsePersona] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);
    const [regenerationFeedback, setRegenerationFeedback] = useState('');
    const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);

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
                use_persona: usePersona,
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

    const handleRegenerate = async (feedback?: string) => {
        if (!currentProfile || !generatedDraft) return;

        setIsRegenerating(true);
        try {
            const filteredKeyPoints = keyPoints.filter(kp => kp.trim());
            const response = await generatorsApi.scratch({
                profile_id: currentProfile.id,
                topic: topic.trim(),
                key_points: filteredKeyPoints,
                goal: goal,
                template_id: selectedTemplateId,
                use_persona: usePersona,
                feedback: feedback || null,
                previous_draft_id: generatedDraft.draft_id,
            });
            setGeneratedDraft(response);
            setShowFeedbackInput(false);
            setRegenerationFeedback('');
        } catch (error) {
            toast({
                title: 'Failed to regenerate',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    const resetForm = () => {
        setStep('input');
        setTopic('');
        setKeyPoints(['']);
        setGoal('thought_leadership');
        setSelectedTemplateId(null);
        setUsePersona(true);
        setGeneratedDraft(null);
        setShowFeedbackInput(false);
        setRegenerationFeedback('');
    };

    const handleClose = () => {
        if (!isLoading) {
            resetForm();
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col sm:max-w-5xl">
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

                            {/* Voice Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Write in my voice</p>
                                    <p className="text-xs text-slate-500">Include your professional identity and expertise</p>
                                </div>
                                <Switch
                                    checked={usePersona}
                                    onCheckedChange={setUsePersona}
                                    disabled={isLoading}
                                />
                            </div>
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
                        <div className="relative">
                            {isRegenerating && (
                                <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                                        <p className="text-sm text-slate-600">Regenerating your draft...</p>
                                    </div>
                                </div>
                            )}
                            <GeneratorReview draft={generatedDraft} />
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
                            {showFeedbackInput ? (
                                <div className="flex-1 flex gap-2 items-end">
                                    <Textarea
                                        value={regenerationFeedback}
                                        onChange={(e) => setRegenerationFeedback(e.target.value)}
                                        placeholder="e.g., Make it more casual, focus on the spiritual aspect..."
                                        className="h-10 min-h-[40px] text-sm flex-1"
                                        disabled={isRegenerating}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setShowFeedbackInput(false); setRegenerationFeedback(''); }}
                                        disabled={isRegenerating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleRegenerate(regenerationFeedback)}
                                        disabled={isRegenerating}
                                        className="bg-cyan-600 hover:bg-cyan-500"
                                    >
                                        {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowFeedbackInput(true)}
                                        disabled={isLoading || isRegenerating}
                                        className="border-slate-300 hover:border-cyan-300"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Regenerate
                                    </Button>
                                    <Button
                                        onClick={handleApprove}
                                        disabled={isLoading || isRegenerating}
                                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                        Approve & Move to Kanban
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
