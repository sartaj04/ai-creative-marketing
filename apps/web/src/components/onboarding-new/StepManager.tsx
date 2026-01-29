'use client';

import { useState, useEffect, useCallback } from 'react';
// import { OnboardingShell } from './OnboardingShell';
import { WelcomeStep } from './steps/WelcomeStep';
import { LinkedInImportStep } from './steps/LinkedInImportStep';
import { AnalysisLoadingStep } from './steps/AnalysisLoadingStep';
import { IdentityConfigurationStep } from './steps/IdentityConfigurationStep';
import { CompletionStep } from './steps/CompletionStep';
import { AgentPanel, AgentState } from './AgentPanel';
import { ContentPanel } from './ContentPanel';
import { onboardingApi } from '@/lib/api/onboarding';
import { useToast } from '@/components/ui/use-toast';

type Step = 'welcome' | 'linkedin_import' | 'manual_setup' | 'analysis' | 'configuration' | 'completion';

export function StepManager() {
    const [step, setStep] = useState<Step>('welcome');
    const [agentState, setAgentState] = useState<AgentState>({ status: 'idle', message: 'Waiting for input...' });
    const [onboardingData, setOnboardingData] = useState<any>({});
    const { toast } = useToast();

    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

    // Debug: Watch for state changes
    useEffect(() => {
        console.log('[StepManager] State changed - step:', step, 'isAnalysisComplete:', isAnalysisComplete);
    }, [step, isAnalysisComplete]);

    // Calculate progress for AgentPanel
    const getStepProgress = () => {
        const map = {
            'welcome': 1,
            'linkedin_import': 2,
            'manual_setup': 2,
            'analysis': 3,
            'configuration': 4,
            'completion': 5
        };
        return map[step];
    };

    const handleStartOption = (option: 'linkedin' | 'manual') => {
        if (option === 'linkedin') {
            setStep('linkedin_import');
            setAgentState({ status: 'idle', message: 'Ready to analyze profile' });
        } else {
            setStep('configuration');
            setAgentState({ status: 'waiting', message: 'Manual configuration mode' });
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
        console.log('[StepManager] handleAnalysisComplete called, moving to configuration step');
        setStep('configuration');
        setAgentState({ status: 'waiting', message: 'Refining identity model' });
    }, []);

    const handleConfigurationComplete = async (data: any) => {
        setOnboardingData({ ...onboardingData, ...data });
        setAgentState({ status: 'building', message: 'Finalizing setup...' });

        try {
            await onboardingApi.complete();
        } catch (error) {
            console.error("Completion failed", error);
        }

        // Simulate final build time for effect
        setTimeout(() => {
            setStep('completion');
            setAgentState({ status: 'idle', message: 'System Ready' });
        }, 2000);
    };

    // Debug: log step changes
    console.log('[StepManager] Current step:', step, 'isAnalysisComplete:', isAnalysisComplete);

    return (
        <div className="flex w-full h-screen bg-white overflow-hidden">
            {/* Left Panel */}
            <div className="w-[400px] flex-shrink-0 hidden lg:block border-r border-slate-100">
                <AgentPanel
                    step={getStepProgress()}
                    totalSteps={5}
                    agentState={agentState}
                />
            </div>

            {/* Right Panel / Main Area */}
            <div className="flex-1 h-full">
                <ContentPanel
                    title={getStepTitle(step)}
                    stepIndicator={`Step ${getStepProgress()}/5`}
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
                            case 'configuration':
                                console.log('[StepManager] Rendering configuration step component');
                                return <IdentityConfigurationStep key="config-step" onComplete={handleConfigurationComplete} />;
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
        case 'analysis': return 'System Analysis';
        case 'configuration': return 'Fine-tune Your Model';
        case 'completion': return 'Setup Complete';
        default: return '';
    }
}
