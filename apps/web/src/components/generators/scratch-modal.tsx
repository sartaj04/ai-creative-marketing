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
import { Loader2, PenLine, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector, GOALS } from './goal-selector';

interface ScratchModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'template';

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
        setStep('input');
    };

    const handleSubmit = async () => {
        if (!currentProfile) {
            toast({ title: 'No profile selected', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const filteredKeyPoints = keyPoints.filter(kp => kp.trim());
            await generatorsApi.scratch({
                profile_id: currentProfile.id,
                topic: topic.trim(),
                key_points: filteredKeyPoints,
                goal: goal,  // Send the goal value, not the label
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
        setTopic('');
        setKeyPoints(['']);
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
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <PenLine className="w-4 h-4 text-blue-600" />
                        </div>
                        Generate from Scratch
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : '2'} of 2
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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {step === 'input' ? (
                        <Button
                            onClick={handleNext}
                            disabled={!topic.trim()}
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
