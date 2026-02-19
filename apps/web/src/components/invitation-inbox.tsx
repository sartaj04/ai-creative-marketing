'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Loader2, Mail } from 'lucide-react';
import { membersApi, type Invitation } from '@/lib/api/members';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

interface InvitationInboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitations: Invitation[];
  onInvitationHandled: () => void;
}

export function InvitationInbox({ open, onOpenChange, invitations, onInvitationHandled }: InvitationInboxProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { fetchProfiles } = useProfileStore();
  const { toast } = useToast();

  const handleAccept = async (invitation: Invitation) => {
    setLoadingId(invitation.id);
    try {
      await membersApi.acceptInvitation(invitation.id);
      await fetchProfiles();
      toast({ title: 'Invitation accepted', description: `You now have access to "${invitation.profile_name}".` });
      onInvitationHandled();
    } catch (error) {
      toast({ title: 'Failed to accept invitation', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invitation: Invitation) => {
    setLoadingId(invitation.id);
    try {
      await membersApi.declineInvitation(invitation.id);
      toast({ title: 'Invitation declined' });
      onInvitationHandled();
    } catch (error) {
      toast({ title: 'Failed to decline invitation', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invitations
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pending invitations</p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invitation.profile_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {invitation.invited_by_name ? `Invited by ${invitation.invited_by_name}` : 'Invitation'} &middot;{' '}
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    disabled={loadingId === invitation.id}
                    onClick={() => handleDecline(invitation)}
                  >
                    {loadingId === invitation.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-2.5"
                    disabled={loadingId === invitation.id}
                    onClick={() => handleAccept(invitation)}
                  >
                    {loadingId === invitation.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
