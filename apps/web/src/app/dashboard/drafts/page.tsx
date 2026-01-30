'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { draftsApi, Draft, DraftStatus } from '@/lib/api/drafts';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { KanbanBoard } from '@/components/drafts/kanban-board';
import { EditDraftDialog } from '@/components/drafts/edit-draft-dialog';
import { PixoCharacter } from '@/components/auth/PixoCharacter';

export default function DraftsPage() {
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const loadDrafts = useCallback(async (showLoading = true) => {
        if (!currentProfile) return;
        if (showLoading) setIsLoading(true);
        try {
            const response = await draftsApi.list({
                profile_id: currentProfile.id,
                limit: 100,
            });
            setDrafts(response.drafts);
        } catch (error) {
            toast({ title: 'Failed to load drafts', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [currentProfile, toast]);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    const handleStatusChange = async (draftId: string, newStatus: DraftStatus) => {
        // Optimistic update
        const previousDrafts = [...drafts];
        setDrafts(drafts.map(d => d.id === draftId ? { ...d, status: newStatus } : d));

        try {
            await draftsApi.updateStatus(draftId, newStatus);
            // Don't reload, just notify success silently or very subtly
            // toast({ title: `Draft moved to ${newStatus}` });
        } catch (error) {
            // Revert
            setDrafts(previousDrafts);
            toast({ title: 'Failed to update status', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const handleEdit = (draft: Draft) => {
        setEditingDraft(draft);
        setIsEditDialogOpen(true);
    };

    const handleDelete = async (draft: Draft) => {
        // Optimistic delete (move to rejected or actually delete if API supported, but we use rejected as 'bin')
        if (confirm('Are you sure you want to move this draft to trash?')) {
            const previousDrafts = [...drafts];
            // If we treat Rejected as trash, just move it there.
            // If it's already rejected, maybe nothing else to do?
            // But if user clicks delete, they expect it to be gone from view if 'Rejected' column isn't the trash can.
            // But since we have a Rejected column, it just moves there.

            const targetStatus: DraftStatus = 'rejected';

            setDrafts(drafts.map(d => d.id === draft.id ? { ...d, status: targetStatus } : d));

            try {
                await draftsApi.updateStatus(draft.id, targetStatus);
                toast({ title: 'Draft moved to rejected' });
            } catch (error) {
                setDrafts(previousDrafts);
                toast({ title: 'Failed to delete draft', description: getErrorMessage(error), variant: 'destructive' });
            }
        }
    };

    const handleSaveEdit = async (draftId: string, hook: string, body: string) => {
        try {
            await draftsApi.action(draftId, {
                action: 'edit',
                edited_hook: hook,
                edited_body: body,
            });

            // Update local state
            setDrafts(drafts.map(d => d.id === draftId ? { ...d, hook, body, status: 'approved' } : d));
            // Note: backend 'edit' action sets status to APPROVED automatically. I should reflect that.

            toast({ title: 'Draft updated' });
        } catch (error) {
            toast({ title: 'Failed to update draft', description: getErrorMessage(error), variant: 'destructive' });
            throw error; // Re-throw to let dialog handle loading state or error display
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
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.25)]">
                            <PixoCharacter />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content Pipeline</h1>
                        <p className="text-slate-500">Manage your content generation workflow</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={() => loadDrafts(true)}>
                        <Calendar className="w-4 h-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            <KanbanBoard
                drafts={drafts}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EditDraftDialog
                draft={editingDraft}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSave={handleSaveEdit}
            />
        </div>
    );
}
