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
import { Loader2, FileText, Upload, Trash2, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector } from './goal-selector';

interface PDFModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'template';

export function PDFModal({ open, onClose }: PDFModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [goal, setGoal] = useState('educate');  // Default for PDFs
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

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
        setStep('input');
    };

    const handleSubmit = async () => {
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
            await generatorsApi.pdf(currentProfile.id, pdfFile, selectedTemplateId);
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
        clearFile();
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
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                        Generate from PDF
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : '2'} of 2
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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {step === 'input' ? (
                        <Button
                            onClick={handleNext}
                            disabled={!pdfFile}
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
