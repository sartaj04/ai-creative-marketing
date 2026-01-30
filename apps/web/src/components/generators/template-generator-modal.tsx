'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, PenLine, Plus, X, ChevronLeft, ChevronRight, Check, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';
import { generatorsApi, TemplateRecommendation } from '@/lib/api/generators';
import { draftsApi } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateGeneratorModalProps {
    open: boolean;
    onClose: () => void;
    templateCategory: string;
    categoryTitle: string;
}

type Step = 'input' | 'review';

export function TemplateGeneratorModal({ open, onClose, templateCategory, categoryTitle }: TemplateGeneratorModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    // Core State
    const [step, setStep] = useState<Step>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [templates, setTemplates] = useState<TemplateRecommendation[]>([]);

    // Selection state
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecommendation | null>(null);
    const [isChangeTemplateOpen, setIsChangeTemplateOpen] = useState(false);

    // Form State
    const [topic, setTopic] = useState('');
    const [keyPoints, setKeyPoints] = useState<string[]>(['']);
    const [generatedDraft, setGeneratedDraft] = useState<{
        draft_id: string;
        hook: string;
        body: string;
        topic: string | null;
        confidence: number;
    } | null>(null);

    // Initial Load
    useEffect(() => {
        if (open && currentProfile) {
            loadTemplates();
        } else {
            // Reset when closed
            setStep('input');
            setTopic('');
            setKeyPoints(['']);
            setGeneratedDraft(null);
            setSelectedTemplate(null);
            setIsChangeTemplateOpen(false);
        }
    }, [open, currentProfile, templateCategory]);

    const loadTemplates = async () => {
        if (!currentProfile) return;
        setIsLoading(true);
        try {
            // Map our UI categories to backend tags/goals if needed, 
            // or just rely on text search/tags.
            // For now, we'll try to use the category as a tag search logic if the API supports it
            // Or we fetch all and filter client side if the API is limited.
            // Assuming recommendTemplates can handle some filtering or we filter manually.

            const response = await generatorsApi.recommendTemplates({
                profile_id: currentProfile.id,
                source_type: 'scratch',
                limit: 50,
                goal: templateCategory // Mapping category to goal for relevance
            });

            // Filter further if needed (e.g. strict category match)
            // For now, assume the goal param does the heavy lifting or we use the results as-is.
            const validTemplates = response.templates;
            setTemplates(validTemplates);

            if (validTemplates.length > 0) {
                // Randomly select one
                const randomIndex = Math.floor(Math.random() * validTemplates.length);
                setSelectedTemplate(validTemplates[randomIndex]);
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Failed to find templates', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleGenerate = async () => {
        if (!currentProfile || !selectedTemplate) return;

        setIsLoading(true);
        try {
            const filteredKeyPoints = keyPoints.filter(kp => kp.trim());
            const response = await generatorsApi.scratch({
                profile_id: currentProfile.id,
                topic: topic.trim(),
                key_points: filteredKeyPoints,
                goal: templateCategory,
                template_id: selectedTemplate.id,
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

    // Suggestions based on category
    const getSuggestions = () => {
        switch (templateCategory) {
            case 'contrarian':
                return ['Marketing is dead', 'Why SEO is overrated', 'Stop using generic hooks', 'Quality over Quantity'];
            case 'story':
                return ['A huge mistake I made', 'How I landed my first client', 'My biggest win this month', 'A lesson from my mentor'];
            case 'educational':
                return ['5 steps to better writing', 'The ultimate guide to LinkedIn', 'How to use AI properly', 'My daily routine'];
            case 'promotional':
                return ['My favorite design tool', 'Why I love Notion', 'Reviewing the new Claude', 'Top 3 productivity apps'];
            case 'thought_leadership':
                return ['The future of SaaS', 'AI agents are the next big thing', 'Remote work is here to stay', ' The end of cold calling'];
            default:
                return ['How to improve productivity', 'My journey so far', 'Tips for beginners'];
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="sm:max-w-2xl">
            <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === 'review' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setStep('input')}
                                disabled={isLoading}
                                className="mr-1 h-8 w-8"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-cyan-600" />
                        </div>
                        {categoryTitle} Generator
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                    {step === 'input' && (
                        <div className="space-y-6">

                            {/* Template Selection Area */}
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Using Template</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                                        onClick={() => setIsChangeTemplateOpen(!isChangeTemplateOpen)}
                                    >
                                        Change Template
                                        <ChevronDown className={`ml-1 w-3 h-3 transition-transform ${isChangeTemplateOpen ? 'rotate-180' : ''}`} />
                                    </Button>
                                </div>

                                {selectedTemplate ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <PenLine className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-900">{selectedTemplate.name}</span>
                                        </div>

                                        {/* Template Structure Preview */}
                                        <div className="mt-2 text-xs text-slate-500 bg-white p-3 rounded border border-slate-100 font-mono">
                                            <p className="font-semibold text-slate-400 mb-1 uppercase text-[10px] tracking-wider">Structure</p>
                                            <div className="line-clamp-3 hover:line-clamp-none transition-all cursor-default">
                                                {selectedTemplate.content}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 flex items-center gap-2">
                                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="text-red-400">No template found</span>}
                                    </div>
                                )}

                                {/* Collapsible Template List */}
                                {isChangeTemplateOpen && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <Label className="text-xs text-slate-500 mb-2 block">Available Templates</Label>
                                        <ScrollArea className="h-64 rounded-md border border-slate-200 bg-white">
                                            <div className="p-2 space-y-1">
                                                {templates.map(t => (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => {
                                                            setSelectedTemplate(t);
                                                            setIsChangeTemplateOpen(false);
                                                        }}
                                                        className={`p-3 rounded text-sm cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all ${selectedTemplate?.id === t.id ? 'bg-cyan-50 text-cyan-700 border-cyan-100' : 'text-slate-700'}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium">{t.name}</span>
                                                            {selectedTemplate?.id === t.id && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <p className="text-xs text-slate-400 line-clamp-2">{t.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>

                            {/* Topic Input */}
                            <div className="space-y-3">
                                <Label htmlFor="topic">What do you want to speak about?</Label>
                                <Input
                                    id="topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., A lesson I learned about leadership..."
                                    className="text-lg py-6"
                                    disabled={isLoading}
                                />
                                {/* Suggestions */}
                                <div className="flex flex-wrap gap-2">
                                    {getSuggestions().map(suggestion => (
                                        <Badge
                                            key={suggestion}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-colors font-normal text-slate-500"
                                            onClick={() => setTopic(suggestion)}
                                        >
                                            {suggestion}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Key Points */}
                            <div className="space-y-2">
                                <Label className="flex justify-between">
                                    <span>Key Points (Optional)</span>
                                    <span className="text-xs text-slate-400 font-normal">Add context for the AI</span>
                                </Label>
                                <div className="space-y-2">
                                    {keyPoints.map((point, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={point}
                                                onChange={(e) => handleKeyPointChange(index, e.target.value)}
                                                placeholder={`Point ${index + 1}`}
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
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAddKeyPoint}
                                        disabled={isLoading}
                                        className="mt-1 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Point
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'review' && generatedDraft && (
                        <div className="space-y-6">
                            {/* Draft Content */}
                            <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
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

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>

                    {step === 'input' && (
                        <Button
                            onClick={handleGenerate}
                            disabled={!topic.trim() || !selectedTemplate || isLoading}
                            className="bg-cyan-600 hover:bg-cyan-500 min-w-[120px]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    Generate Draft
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    )}

                    {step === 'review' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep('input')}
                                disabled={isLoading}
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
                                Approve & Save
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
