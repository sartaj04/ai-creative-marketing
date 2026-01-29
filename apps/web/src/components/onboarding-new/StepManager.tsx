'use client';

import { useState, useEffect, useCallback } from 'react';
import { WelcomeStep } from './steps/WelcomeStep';
import { LinkedInImportStep } from './steps/LinkedInImportStep';
import { AnalysisLoadingStep } from './steps/AnalysisLoadingStep';
import { ProfessionalStep } from './steps/ProfessionalStep';
import { InterestsStep } from './steps/InterestsStep';
import { VoiceStep } from './steps/VoiceStep';
import { CompletionStep } from './steps/CompletionStep';
import { AgentPanel, AgentState } from './AgentPanel';
import { ContentPanel } from './ContentPanel';
import { onboardingApi, ProfessionalStepData, InterestsStepData, VoiceStepData } from '@/lib/api/onboarding';
import { useToast } from '@/components/ui/use-toast';

type Step = 'welcome' | 'linkedin_import' | 'professional' | 'analysis' | 'interests' | 'voice' | 'completion';

export function StepManager() {
    const [step, setStep] = useState<Step>('welcome');
    const [agentState, setAgentState] = useState<AgentState>({ status: 'idle', message: 'Waiting for input...' });
    const [onboardingData, setOnboardingData] = useState<any>({});
    const [isManualPath, setIsManualPath] = useState(false);
    const { toast } = useToast();

    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

    // Debug: Watch for state changes
    useEffect(() => {
        console.log('[StepManager] State changed - step:', step, 'isAnalysisComplete:', isAnalysisComplete);
    }, [step, isAnalysisComplete]);

    // Calculate progress for AgentPanel (6 steps total now)
    const getStepProgress = () => {
        const linkedInMap: Record<Step, number> = {
            'welcome': 1,
            'linkedin_import': 2,
            'professional': 2, // Not used in LinkedIn path
            'analysis': 3,
            'interests': 4,
            'voice': 5,
            'completion': 6
        };
        const manualMap: Record<Step, number> = {
            'welcome': 1,
            'linkedin_import': 2,
            'professional': 2,
            'analysis': 3,
            'interests': 3,
            'voice': 4,
            'completion': 5
        };
        return isManualPath ? manualMap[step] : linkedInMap[step];
    };

    const getTotalSteps = () => isManualPath ? 5 : 6;

    const handleStartOption = (option: 'linkedin' | 'manual') => {
        if (option === 'linkedin') {
            setIsManualPath(false);
            setStep('linkedin_import');
            setAgentState({ status: 'idle', message: 'Ready to analyze profile' });
        } else {
            setIsManualPath(true);
            setStep('professional');
            setAgentState({ status: 'waiting', message: 'Tell us about yourself' });
        }
    };

    const handleFileSelect = async (file: File) => {
        console.log('[StepManager] handleFileSelect called with file:', file.name);
        setStep('analysis');
        setIsAnalysisComplete(false); // Reset
        setAgentState({ status: 'analyzing', message: 'Pixo is analyzing document...' });

        // Safety timeout: if analysis takes too long, mark as complete anyway
        const safetyTimeout = setTimeout(() => {
            console.warn('[StepManager] Safety timeout triggered - forcing analysis complete');
            setIsAnalysisComplete(true);
        }, 30000); // 30 seconds max

        try {
            console.log('[StepManager] Calling uploadResume API...');
            const result = await onboardingApi.uploadResume(file);
            clearTimeout(safetyTimeout);
            
            console.log('[StepManager] Upload result received:', { 
                success: result.success, 
                hasData: !!result.data, 
                hasSummary: !!result.extraction_summary,
                error: result.error 
            });
            
            // Always mark as complete if we got a response (even if it failed, we can continue)
            // The API returns 200 OK even on errors, so we should always advance
            console.log('[StepManager] Got response, marking analysis complete');
            setIsAnalysisComplete(true);
            
            if (result.success) {
                console.log('[StepManager] Extraction successful');
                setAgentState({ status: 'analyzing', message: 'Analysis complete!' });
            } else {
                // Extraction failed but we can still continue
                console.warn("[StepManager] Extraction returned success=false:", result);
                setAgentState({ status: 'analyzing', message: 'Analysis complete (partial)' });
                if (result.error) {
                    toast({
                        title: "Partial Analysis",
                        description: result.error,
                        variant: "default"
                    });
                }
            }
        } catch (error: any) {
            clearTimeout(safetyTimeout);
            console.error("[StepManager] Upload failed:", error);
            console.error("[StepManager] Error details:", {
                message: error?.message,
                response: error?.response?.data,
                status: error?.response?.status
            });
            
            // Even if it fails, let them continue with manual configuration
            setIsAnalysisComplete(true);
            
            const errorMessage = error?.response?.data?.error || error?.response?.data?.detail || error?.message || "Unable to parse the file";
            toast({
                title: "Analysis Issue",
                description: `${errorMessage}. You can continue with manual setup.`,
                variant: "default"
            });
        }
    };

    const handleAnalysisComplete = useCallback(() => {
        console.log('[StepManager] handleAnalysisComplete called, moving to interests step');
        setStep('interests');
        setAgentState({ status: 'waiting', message: 'Understanding your personality' });
    }, []);

    const handleProfessionalComplete = async (data: ProfessionalStepData) => {
        setOnboardingData({ ...onboardingData, professional: data });
        setAgentState({ status: 'building', message: 'Saving professional background...' });

        try {
            await onboardingApi.saveStep({
                step_name: 'professional',
                professional_data: data,
            });
            setStep('interests');
            setAgentState({ status: 'waiting', message: 'Understanding your personality' });
        } catch (error) {
            console.error("Failed to save professional data", error);
            toast({
                title: "Save Error",
                description: "Failed to save your professional background. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleInterestsComplete = async (data: InterestsStepData) => {
        setOnboardingData({ ...onboardingData, interests: data });
        setAgentState({ status: 'building', message: 'Saving interests...' });

        try {
            await onboardingApi.saveStep({
                step_name: 'interests',
                interests_data: data,
            });
            setStep('voice');
            setAgentState({ status: 'waiting', message: 'Finding your voice' });
        } catch (error) {
            console.error("Failed to save interests data", error);
            toast({
                title: "Save Error",
                description: "Failed to save your interests. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleVoiceComplete = async (data: VoiceStepData) => {
        setOnboardingData({ ...onboardingData, voice: data });
        setAgentState({ status: 'building', message: 'Building your voice profile...' });

        try {
            await onboardingApi.saveStep({
                step_name: 'voice',
                voice_data: data,
            });
            
            // Complete onboarding
            await onboardingApi.complete();
            
            setStep('completion');
            setAgentState({ status: 'idle', message: 'System Ready' });
        } catch (error) {
            console.error("Failed to complete onboarding", error);
            toast({
                title: "Completion Error",
                description: "Failed to finalize your profile. Please try again.",
                variant: "destructive"
            });
        }
    };

    // Debug: log step changes
    console.log('[StepManager] Current step:', step, 'isAnalysisComplete:', isAnalysisComplete);

    return (
        <div className="flex w-full h-screen bg-white overflow-hidden">
            {/* Left Panel */}
            <div className="w-[400px] flex-shrink-0 hidden lg:block border-r border-slate-100">
                <AgentPanel
                    step={getStepProgress()}
                    totalSteps={getTotalSteps()}
                    agentState={agentState}
                />
            </div>

            {/* Right Panel / Main Area */}
            <div className="flex-1 h-full">
                <ContentPanel
                    title={getStepTitle(step)}
                    stepIndicator={`Step ${getStepProgress()}/${getTotalSteps()}`}
                >
                    {(() => {
                        console.log('[StepManager] Rendering step:', step);
                        switch (step) {
                            case 'welcome':
                                return <WelcomeStep onSelectOption={handleStartOption} />;
                            case 'linkedin_import':
                                return <LinkedInImportStep onFileSelect={handleFileSelect} isProcessing={agentState.status === 'analyzing'} />;
                            case 'analysis':
                                return <AnalysisLoadingStep onComplete={handleAnalysisComplete} isAnalysisComplete={isAnalysisComplete} />;
                            case 'professional':
                                return <ProfessionalStep onComplete={handleProfessionalComplete} />;
                            case 'interests':
                                return <InterestsStep onComplete={handleInterestsComplete} />;
                            case 'voice':
                                return <VoiceStep onComplete={handleVoiceComplete} />;
                            case 'completion':
                                return <CompletionStep />;
                            default:
                                return (
                                    <div className="text-center py-12">
                                        <p className="text-slate-500">Unknown step: {step}</p>
                                    </div>
                                );
                        }
                    })()}
                </ContentPanel>
            </div>
        </div>
    );
}

function getStepTitle(step: Step): string {
    switch (step) {
        case 'welcome': return 'Welcome to Pixo';
        case 'linkedin_import': return 'Import Professional Identity';
        case 'professional': return 'Professional Background';
        case 'analysis': return 'System Analysis';
        case 'interests': return 'Your Interests & Personality';
        case 'voice': return 'Find Your Voice';
        case 'completion': return 'Setup Complete';
        default: return '';
    }
}
