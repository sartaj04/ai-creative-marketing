'use client';

import { useEffect, useState } from 'react';
import { DeepenIdentityModal } from '@/components/identity/DeepenIdentityModal';
import { TimelineEventEditDialog } from '@/components/identity/TimelineEventEditDialog';
import { useProfileStore } from '@/stores/profile-store';
import { identityApi, Timeline, TimelineEvent } from '@/lib/api/identity';
import { TimelineVisualizer } from '@/components/identity/TimelineVisualizer';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function IdentityPage() {
    const { currentProfile } = useProfileStore();
    const [timeline, setTimeline] = useState<Timeline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
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
                        Your professional journey and key moments that shape your narrative. Click any event to edit it.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Link href="/identity">
                        <Button variant="outline" className="gap-2 border-cyan-200 hover:bg-cyan-50 text-cyan-700 font-medium">
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                            Identity Universe
                        </Button>
                    </Link>
                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                    <Button variant="outline" className="gap-2 bg-white font-medium text-slate-700 shadow-sm border-slate-200" onClick={() => setEditingEvent({ id: '', title: '', description: '', event_type: 'custom' } as unknown as TimelineEvent)}>
                        <Plus className="w-4 h-4 text-slate-400" />
                        Add Event
                    </Button>
                    <DeepenIdentityModal onComplete={handleDeepenComplete} />
                </div>
            </div>

            {timeline && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[600px]">
                    <TimelineVisualizer
                        events={timeline.events || []}
                        onEventClick={(event) => setEditingEvent(event)}
                    />
                </div>
            )}

            <TimelineEventEditDialog
                event={editingEvent}
                profileId={currentProfile.id}
                onOpenChange={(open) => { if (!open) setEditingEvent(null); }}
                onSaved={loadTimeline}
            />
        </div>
    );
}
