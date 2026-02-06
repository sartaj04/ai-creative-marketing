'use client';

import { useEffect, useState } from 'react';
import { DeepenIdentityModal } from '@/components/identity/DeepenIdentityModal';
import { useProfileStore } from '@/stores/profile-store';
import { identityApi, Timeline } from '@/lib/api/identity';
import { TimelineVisualizer } from '@/components/identity/TimelineVisualizer';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function IdentityPage() {
    const { currentProfile } = useProfileStore();
    const [timeline, setTimeline] = useState<Timeline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadTimeline = async () => {
        if (!currentProfile) return;

        try {
            setIsLoading(true);
            const data = await identityApi.getTimeline(currentProfile.id);
            setTimeline(data);
        } catch (error) {
            console.error('Failed to load timeline:', error);
            toast({
                title: "Could not load timeline",
                description: "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProfile?.id]);

    const handleDeepenComplete = () => {
        toast({
            title: "Timeline Updated",
            description: "Your new stories have been added.",
        });
        loadTimeline();
    };

    if (!currentProfile) {
        return <div className="p-8 text-center text-slate-500">Please select a profile.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Identity Timeline</h1>
                    <p className="text-slate-500 mt-1">
                        Your professional journey and key moments that shape your narrative.
                    </p>
                </div>
                <div className="flex gap-3">
                    <DeepenIdentityModal onComplete={handleDeepenComplete} />
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Sparkles className="w-4 h-4" />
                        Generate Content from Timeline
                    </Button>
                </div>
            </div>

            {timeline && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[600px]">
                    <TimelineVisualizer events={timeline.events || []} />
                </div>
            )}
        </div>
    );
}
