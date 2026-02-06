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
import { Loader2, Mic, Square, Upload, Trash2, ChevronLeft, ChevronRight, Check, RefreshCw, MessageSquare } from 'lucide-react';
import { generatorsApi } from '@/lib/api/generators';
import { draftsApi } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { TemplateSelector } from './template-selector';
import { GoalSelector } from './goal-selector';
import { GeneratorReview, GeneratedDraft } from './generator-review';

interface AudioModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = 'input' | 'template' | 'review';

export function AudioModal({ open, onClose }: AudioModalProps) {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('input');
    const [isRecording, setIsRecording] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [goal, setGoal] = useState('share_experience');  // Default for audio
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [usePersona, setUsePersona] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);
    const [regenerationFeedback, setRegenerationFeedback] = useState('');
    const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
                setAudioFile(file);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            toast({
                title: 'Microphone access denied',
                description: 'Please allow microphone access to record audio.',
                variant: 'destructive'
            });
        }
    }, [toast]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
            if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
                toast({
                    title: 'Invalid file type',
                    description: 'Please upload an MP3, WAV, M4A, OGG, or WebM file.',
                    variant: 'destructive'
                });
                return;
            }
            setAudioFile(file);
            setAudioUrl(URL.createObjectURL(file));
        }
    };

    const clearAudio = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioFile(null);
        setAudioUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleNext = () => {
        if (!audioFile) {
            toast({ title: 'Please record or upload audio', variant: 'destructive' });
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

        if (!audioFile) {
            toast({ title: 'Please record or upload audio', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await generatorsApi.audio(currentProfile.id, audioFile, selectedTemplateId, usePersona);
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
        if (!currentProfile || !generatedDraft || !audioFile) return;

        setIsRegenerating(true);
        try {
            const response = await generatorsApi.audio(
                currentProfile.id,
                audioFile,
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
        clearAudio();
        setIsRecording(false);
        setGoal('share_experience');
        setSelectedTemplateId(null);
        setUsePersona(true);
        setGeneratedDraft(null);
        setShowFeedbackInput(false);
        setRegenerationFeedback('');
    };

    const handleClose = () => {
        if (!isLoading && !isRecording) {
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
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-red-600" />
                        </div>
                        Generate from Audio
                        <span className="text-xs text-slate-400 font-normal ml-auto">
                            Step {step === 'input' ? '1' : step === 'template' ? '2' : '3'} of 3
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 'input' && (
                        <div className="space-y-6">
                            {/* Recording Controls */}
                            <div className="space-y-4">
                                <Label>Record Audio</Label>
                                <div className="flex items-center justify-center gap-4 p-6 border-2 border-dashed border-slate-200 rounded-lg">
                                    {!isRecording ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="lg"
                                            onClick={startRecording}
                                            disabled={isLoading || !!audioFile}
                                            className="gap-2"
                                        >
                                            <Mic className="w-5 h-5" />
                                            Start Recording
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="lg"
                                            onClick={stopRecording}
                                            className="gap-2 animate-pulse"
                                        >
                                            <Square className="w-5 h-5" />
                                            Stop Recording
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Or Upload */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-500">Or upload a file</span>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="audio-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading || isRecording || !!audioFile}
                                    className="w-full gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload Audio File
                                </Button>
                                <p className="text-xs text-slate-500 text-center">
                                    Supports MP3, WAV, M4A, OGG, WebM (max 25MB)
                                </p>
                            </div>

                            {/* Audio Preview */}
                            {audioUrl && (
                                <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <Label>Preview</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearAudio}
                                            disabled={isLoading}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Remove
                                        </Button>
                                    </div>
                                    <audio controls src={audioUrl} className="w-full" />
                                    <p className="text-xs text-slate-500">
                                        {audioFile?.name} ({((audioFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                </div>
                            )}

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
                            sourceType="audio"
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
                    <Button variant="outline" onClick={handleClose} disabled={isLoading || isRecording}>
                        Cancel
                    </Button>
                    {step === 'input' && (
                        <Button
                            onClick={handleNext}
                            disabled={isRecording || !audioFile}
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
