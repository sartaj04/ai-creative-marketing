'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Loader2, Linkedin, Twitter, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { draftsApi, Draft, DraftStatus } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

const COLUMN_CONFIG: { id: DraftStatus; title: string; color: string }[] = [
    { id: 'inbox', title: 'Inbox', color: 'bg-slate-50' },
    { id: 'approved', title: 'Approved', color: 'bg-cyan-50/50' },
    { id: 'scheduled', title: 'Scheduled', color: 'bg-purple-50/50' },
    { id: 'published', title: 'Published', color: 'bg-emerald-50/50' },
];

const STATUS_OPTIONS: { value: DraftStatus; label: string }[] = [
    { value: 'inbox', label: 'Inbox' },
    { value: 'approved', label: 'Approved' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'rejected', label: 'Rejected' },
];

function getRelativeTime(dateString: string): string {
    const now = Date.now();
    const created = new Date(dateString).getTime();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
}

function PlatformBadge({ draft }: { draft: Draft }) {
    const platform = draft.platform;
    if (platform === 'linkedin') {
        return (
            <span className="text-[10px] font-bold px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1">
                <Linkedin className="w-3 h-3" /> LINKEDIN
            </span>
        );
    }
    if (platform === 'twitter') {
        return (
            <span className="text-[10px] font-bold px-2 py-1 rounded border bg-sky-50 text-sky-700 border-sky-100 flex items-center gap-1">
                <Twitter className="w-3 h-3" /> TWITTER
            </span>
        );
    }
    return (
        <span className="text-[10px] font-bold px-2 py-1 rounded border bg-slate-50 text-slate-600 border-slate-200 uppercase">
            {draft.format}
        </span>
    );
}

export default function DraftsPage() {
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();
    const [draftsByStatus, setDraftsByStatus] = useState<Record<DraftStatus, Draft[]>>({
        inbox: [], approved: [], scheduled: [], published: [], rejected: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    const loadDrafts = useCallback(async () => {
        if (!currentProfile) return;
        setIsLoading(true);
        try {
            const response = await draftsApi.list({
                profile_id: currentProfile.id,
                limit: 100,
            });
            const grouped: Record<DraftStatus, Draft[]> = {
                inbox: [], approved: [], scheduled: [], published: [], rejected: [],
            };
            response.drafts.forEach(d => {
                grouped[d.status].push(d);
            });
            setDraftsByStatus(grouped);
        } catch (error) {
            toast({ title: 'Failed to load drafts', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [currentProfile, toast]);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    const handleStatusChange = async (draftId: string, newStatus: DraftStatus) => {
        try {
            await draftsApi.updateStatus(draftId, newStatus);
            toast({ title: `Draft moved to ${newStatus}` });
            loadDrafts();
        } catch (error) {
            toast({ title: 'Failed to update status', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-8 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content Pipeline</h1>
                    <p className="text-slate-500">Manage your content generation workflow</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={loadDrafts}>
                        <Calendar className="w-4 h-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-8 h-full">
                {COLUMN_CONFIG.map((col) => {
                    const columnDrafts = draftsByStatus[col.id];
                    return (
                        <div key={col.id} className="min-w-[320px] flex flex-col bg-slate-100/50 rounded-xl p-4 border border-slate-200">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-600">{col.title}</h3>
                                    <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-200 font-mono font-medium">
                                        {columnDrafts.length}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                {columnDrafts.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        No drafts
                                    </div>
                                )}
                                {columnDrafts.map((draft, i) => (
                                    <motion.div
                                        key={draft.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card className="hover:shadow-lg transition-all border-slate-200 hover:border-cyan-300 group">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <PlatformBadge draft={draft} />
                                                    <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    handleStatusChange(draft.id, e.target.value as DraftStatus);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        >
                                                            <option value="">Move to...</option>
                                                            {STATUS_OPTIONS.filter(s => s.value !== draft.status).map(s => (
                                                                <option key={s.value} value={s.value}>
                                                                    {s.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>

                                                <p className="text-sm font-semibold leading-relaxed text-slate-800 line-clamp-2">
                                                    {draft.hook || draft.topic || 'Untitled Draft'}
                                                </p>

                                                {draft.body && (
                                                    <p className="text-xs text-slate-500 line-clamp-2">
                                                        {draft.body}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[8px] text-white font-bold">
                                                            AI
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-medium capitalize">{draft.format}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{getRelativeTime(draft.created_at)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
