'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LinkedInURLStep } from './steps/LinkedInURLStep';
import { LinkedInImportStep } from './steps/LinkedInImportStep';
import { ContentFocusStep } from './steps/ContentFocusStep';
import { onboardingApi } from '@/lib/api/onboarding';
import { useToast } from '@/components/ui/use-toast';
import { useProfileStore } from '@/stores/profile-store';

type OnboardingPath = 'linkedin-url' | 'resume-upload' | 'content-focus';

export function StepManager() {
    const [currentPath, setCurrentPath] = useState<OnboardingPath>('linkedin-url');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const { toast } = useToast();
    const router = useRouter();
    const { fetchProfiles } = useProfileStore();

    const completeAndRedirect = async () => {
        setIsComplete(true);
        try {
            await onboardingApi.complete();
            await fetchProfiles();
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
        }
        // Redirect to dashboard immediately
        setTimeout(() => router.push('/dashboard'), 1500);
    };

    // Path 1: LinkedIn URL submission
    const handleLinkedInUrlSubmit = async (url: string) => {
        setIsSubmitting(true);
        try {
            const result = await onboardingApi.submitLinkedInUrl(url);

            if (!result.success) {
                toast({
                    title: "Extraction Failed",
                    description: result.message || result.error || "Could not extract data. Please try uploading a PDF instead.",
                    variant: "destructive",
                });
                return;
            }

            if (result.success && result.posts_scraping_queued) {
                toast({
                    title: "Analyzing your posts",
                    description: "We're analyzing your LinkedIn posts in the background.",
                });
            }

            // If we got suggested topics, show the content focus step
            if (result.success && result.suggested_topics && result.suggested_topics.length > 0) {
                setSuggestedTopics(result.suggested_topics);
                setIsSubmitting(false);
                setCurrentPath('content-focus');
                return;
            }
        } catch (error: any) {
            console.error('LinkedIn URL submission failed:', error);
            toast({
                title: "Could not process URL",
                description: "We'll set up your profile without it. You can add it later.",
                variant: "default",
            });
        } finally {
            setIsSubmitting(false);
        }

        // If no suggested topics, go straight to completion
        await completeAndRedirect();
    };

    // Path 2: Resume/PDF upload
    const handleResumeUpload = async (file: File) => {
        setIsSubmitting(true);
        try {
            const result = await onboardingApi.uploadResume(file);

            if (result.success) {
                toast({
                    title: "Profile analyzed",
                    description: "We've extracted your professional information.",
                });
            } else if (result.error) {
                toast({
                    title: "Partial extraction",
                    description: result.error,
                    variant: "default",
                });
            }

            // Check if resume extraction returned suggested topics
            const resumeTopics = (result as any)?.suggested_topics;
            if (result.success && resumeTopics && resumeTopics.length > 0) {
                setSuggestedTopics(resumeTopics);
                setIsSubmitting(false);
                setCurrentPath('content-focus');
                return;
            }
        } catch (error: any) {
            console.error('Resume upload failed:', error);
            toast({
                title: "Could not process file",
                description: "We'll set up your profile without it. You can add it later.",
                variant: "default",
            });
        } finally {
            setIsSubmitting(false);
        }

        await completeAndRedirect();
    };

    // Content focus submission
    const handleContentFocusSubmit = async (topics: string[]) => {
        setIsSubmitting(true);
        try {
            await onboardingApi.saveContentFocus(topics);
        } catch (error) {
            console.error('Failed to save content focus:', error);
            // Non-critical: continue even if save fails
        } finally {
            setIsSubmitting(false);
        }
        await completeAndRedirect();
    };



    if (currentPath === 'content-focus') {
        return (
            <ContentFocusStep
                suggestedTopics={suggestedTopics}
                onSubmit={handleContentFocusSubmit}
                isSubmitting={isSubmitting}
            />
        );
    }

    if (currentPath === 'resume-upload') {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4 sm:px-6">
                <div className="w-full max-w-lg">
                    <LinkedInImportStep
                        onFileSelect={handleResumeUpload}
                        isProcessing={isSubmitting}
                        onBack={() => setCurrentPath('linkedin-url')}
                    />
                </div>
            </div>
        );
    }

    // Default: LinkedIn URL step
    return (
        <LinkedInURLStep
            onSubmit={handleLinkedInUrlSubmit}
            onUploadResume={() => setCurrentPath('resume-upload')}
            isSubmitting={isSubmitting}
            isComplete={isComplete}
        />
    );
}
