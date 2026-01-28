'use client';

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profile-store';
import { draftsApi, Draft, DraftStatus } from '@/lib/api/drafts';
import { KanbanBoard } from '@/components/drafts/kanban-board';
import { DraftEditorModal } from '@/components/drafts/draft-editor-modal';
import { ScheduleModal } from '@/components/drafts/schedule-modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, FileText } from 'lucide-react';

export default function DraftsPage() {
  const { currentProfile } = useProfileStore();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [schedulingDraft, setSchedulingDraft] = useState<Draft | null>(null);

  const fetchDrafts = async () => {
    if (!currentProfile) return;

    setIsLoading(true);
    try {
      // Fetch all non-inbox, non-rejected drafts
      const [approved, scheduled, published] = await Promise.all([
        draftsApi.list({ profile_id: currentProfile.id, status: 'approved', limit: 50 }),
        draftsApi.list({ profile_id: currentProfile.id, status: 'scheduled', limit: 50 }),
        draftsApi.list({ profile_id: currentProfile.id, status: 'published', limit: 50 }),
      ]);

      setDrafts([
        ...approved.drafts,
        ...scheduled.drafts,
        ...published.drafts,
      ]);
    } catch (error) {
      toast({
        title: 'Failed to load drafts',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [currentProfile]);

  const handleStatusChange = async (draftId: string, newStatus: DraftStatus) => {
    try {
      const updatedDraft = await draftsApi.updateStatus(draftId, newStatus);

      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: newStatus } : d))
      );

      toast({
        title: 'Status updated',
        description: `Draft moved to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update status',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSaved = () => {
    fetchDrafts();
    setEditingDraft(null);
  };

  const handleScheduled = () => {
    fetchDrafts();
    setSchedulingDraft(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading drafts...</div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">No profile selected</h2>
        <p className="text-muted-foreground">Create a profile to manage drafts.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Drafts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your approved, scheduled, and published content
          </p>
        </div>
        <Button onClick={fetchDrafts} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden p-6">
        {drafts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">No drafts yet</h2>
            <p className="text-muted-foreground">
              Approve drafts from your Inbox to see them here.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/inbox'}>
              Go to Inbox
            </Button>
          </div>
        ) : (
          <KanbanBoard
            drafts={drafts}
            onStatusChange={handleStatusChange}
            onEdit={setEditingDraft}
            onSchedule={setSchedulingDraft}
          />
        )}
      </div>

      {/* Modals */}
      <DraftEditorModal
        draft={editingDraft}
        open={!!editingDraft}
        onOpenChange={(open) => !open && setEditingDraft(null)}
        onSaved={handleEditSaved}
      />

      <ScheduleModal
        draft={schedulingDraft}
        open={!!schedulingDraft}
        onOpenChange={(open) => !open && setSchedulingDraft(null)}
        onScheduled={handleScheduled}
      />
    </div>
  );
}
