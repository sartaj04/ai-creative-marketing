'use client';

import { useState } from 'react';
import { Draft, draftsApi } from '@/lib/api/drafts';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface DraftEditorModalProps {
  draft: Draft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DraftEditorModal({
  draft,
  open,
  onOpenChange,
  onSaved,
}: DraftEditorModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hook, setHook] = useState(draft?.hook || '');
  const [body, setBody] = useState(draft?.body || '');

  // Update state when draft changes
  useState(() => {
    if (draft) {
      setHook(draft.hook);
      setBody(draft.body);
    }
  });

  const handleSave = async () => {
    if (!draft) return;

    setIsLoading(true);
    try {
      await draftsApi.action(draft.id, {
        action: 'edit',
        edited_hook: hook,
        edited_body: body,
      });

      toast({
        title: 'Draft updated',
        description: 'Your changes have been saved.',
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Edit Draft</DialogTitle>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          {draft.topic && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {draft.topic}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
            {draft.format}
          </span>
          <span className="text-xs text-muted-foreground ml-auto capitalize">
            {draft.status}
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hook">Hook</Label>
          <Input
            id="hook"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="Enter the hook..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter the body content..."
            className="min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Confidence: {Math.round(draft.confidence * 100)}%</p>
          <p>Created: {new Date(draft.created_at).toLocaleString()}</p>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
