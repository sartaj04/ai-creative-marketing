'use client';

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profile-store';
import { draftsApi, Draft, DraftAction } from '@/lib/api/drafts';
import { SwipeCard } from '@/components/inbox/swipe-card';
import { ActionButtons } from '@/components/inbox/action-buttons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Inbox as InboxIcon } from 'lucide-react';

export default function InboxPage() {
  const { currentProfile } = useProfileStore();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchDrafts = async () => {
    if (!currentProfile) return;

    setIsLoading(true);
    try {
      const response = await draftsApi.list({
        profile_id: currentProfile.id,
        status: 'inbox',
        limit: 20,
      });
      setDrafts(response.drafts);
      setCurrentIndex(0);
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

  const currentDraft = drafts[currentIndex];

  const handleAction = async (action: DraftAction, feedback?: string, editedHook?: string, editedBody?: string) => {
    if (!currentDraft) return;

    setIsActionLoading(true);
    try {
      await draftsApi.action(currentDraft.id, {
        action,
        feedback,
        edited_hook: editedHook,
        edited_body: editedBody,
      });

      // Remove draft from list and move to next
      setDrafts((prev) => prev.filter((d) => d.id !== currentDraft.id));

      const actionLabels: Record<DraftAction, string> = {
        approve: 'approved',
        reject: 'rejected',
        edit: 'edited and approved',
        schedule: 'scheduled',
        publish: 'published',
      };

      toast({
        title: `Draft ${actionLabels[action]}`,
        description: action === 'approve' ? 'Great choice! The draft has been moved to your approved list.' : undefined,
      });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
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
        <InboxIcon className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">No profile selected</h2>
        <p className="text-muted-foreground">Create a profile to start receiving drafts.</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <InboxIcon className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">Inbox is empty</h2>
        <p className="text-muted-foreground">Your AI agents are working on new drafts.</p>
        <Button onClick={fetchDrafts} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''} waiting for review
          </p>
        </div>
        <Button onClick={fetchDrafts} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Swipe Area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="relative h-[500px] w-full max-w-lg">
          {currentDraft && (
            <SwipeCard
              draft={currentDraft}
              onApprove={() => handleAction('approve')}
              onReject={() => handleAction('reject')}
              onEdit={(hook, body, feedback) => handleAction('edit', feedback, hook, body)}
              disabled={isActionLoading}
            />
          )}
        </div>

        {/* Action Buttons (desktop fallback) */}
        <ActionButtons
          onApprove={() => handleAction('approve')}
          onReject={() => handleAction('reject')}
          onEdit={() => {}}
          disabled={isActionLoading || !currentDraft}
        />

        {/* Progress indicator */}
        <div className="mt-4 text-sm text-muted-foreground">
          {currentIndex + 1} of {drafts.length}
        </div>
      </div>
    </div>
  );
}
