'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { Loader2, FileText, Upload, Trash2, File, ChevronLeft, ChevronRight, Check, RefreshCw, MessageSquare } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { draftsApi } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector } from './goal-selector';
import { GeneratorReview, GeneratedDraft } from './generator-review';

interface PDFModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'template' | 'review';

export function PDFModal({ open, onClose }: PDFModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [goal, setGoal] = useState('educate');  // Default for PDFs
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [usePersona, setUsePersona] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);
    const [regenerationFeedback, setRegenerationFeedback] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            toast({
                title: 'Invalid file type',
                description: 'Please upload a PDF file.',
                variant: 'destructive'
            });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Maximum file size is 10MB.',
                variant: 'destructive'
            });
            return;
        }

        setPdfFile(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, []);

    const clearFile = () => {
        setPdfFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleNext = () => {
        if (!pdfFile) {
            toast({ title: 'Please upload a PDF file', variant: 'destructive' });
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

        if (!pdfFile) {
            toast({ title: 'Please upload a PDF file', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await generatorsApi.pdf(currentProfile.id, pdfFile, selectedTemplateId, usePersona);
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
        if (!currentProfile || !generatedDraft || !pdfFile) return;

        setIsRegenerating(true);
        try {
            const response = await generatorsApi.pdf(
                currentProfile.id,
                pdfFile,
                selectedTemplateId,
                usePersona,
                feedback || null,
                generatedDraft.draft_id,
            );
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
        clearFile();
        setGoal('educate');
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
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                        Generate from PDF
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : step === 'template' ? '2' : '3'} of 3
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 'input' && (
                        <div className="space-y-4">
                            <Label>Upload PDF Document *</Label>

                            {/* Drop Zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                                    relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                                    ${isDragging ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'}
                                    ${pdfFile ? 'bg-slate-50' : ''}
                                `}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="pdf-upload"
                                />

                                {!pdfFile ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                Drag and drop your PDF here
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                or click to browse
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading}
                                        >
                                            Select PDF
                                        </Button>
                                        <p className="text-xs text-slate-400">
                                            Maximum file size: 10MB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                                            <File className="w-8 h-8 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 truncate max-w-xs mx-auto">
                                                {pdfFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFile}
                                            disabled={isLoading}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Remove
                                        </Button>
                                    </div>
                                )}
                            </div>

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

                            <p className="text-sm text-slate-500">
                                Upload a PDF document and our AI agents will extract the key insights to create a LinkedIn post.
                            </p>
                        </div>
                    )}

                    {step === 'template' && currentProfile && (
                        <TemplateSelector
                            profileId={currentProfile.id}
                            sourceType="pdf"
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
                            disabled={!pdfFile}
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
                                        placeholder="e.g., Make it more casual, focus on the key takeaway..."
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
