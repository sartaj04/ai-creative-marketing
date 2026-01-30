'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Draft } from '@/lib/api/drafts';
import { Loader2 } from 'lucide-react';

interface EditDraftDialogProps {
    draft: Draft | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (draftId: string, hook: string, body: string) => Promise<void>;
}

export function EditDraftDialog({
    draft,
    open,
    onOpenChange,
    onSave,
}: EditDraftDialogProps) {
    const [hook, setHook] = useState('');
    const [body, setBody] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (draft) {
            setHook(draft.hook || '');
            setBody(draft.body || '');
        }
    }, [draft]);

    const handleSave = async () => {
        if (!draft) return;
        setIsSaving(true);
        try {
            await onSave(draft.id, hook, body);
            onOpenChange(false);
        } catch (error) {
            // Error handling is done in parent
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Draft</DialogTitle>
                    <DialogDescription>
                        Make changes to your draft here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="hook">Hook / Title</Label>
                        <Textarea
                            id="hook"
                            value={hook}
                            onChange={(e) => setHook(e.target.value)}
                            className="resize-none h-24"
                            placeholder="Enter your hook..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="body">Content Body</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="min-h-[200px]"
                            placeholder="Enter the main content..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
