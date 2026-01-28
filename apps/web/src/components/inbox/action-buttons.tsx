'use client';

import { Button } from '@/components/ui/button';
import { Check, X, Edit3 } from 'lucide-react';

interface ActionButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  disabled?: boolean;
}

export function ActionButtons({
  onApprove,
  onReject,
  onEdit,
  disabled,
}: ActionButtonsProps) {
  return (
    <div className="mt-6 flex items-center justify-center space-x-4">
      <Button
        variant="outline"
        size="lg"
        className="h-14 w-14 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={onReject}
        disabled={disabled}
        title="Reject (swipe left)"
      >
        <X className="h-6 w-6" />
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="h-12 w-12 rounded-full"
        onClick={onEdit}
        disabled={disabled}
        title="Edit (swipe up)"
      >
        <Edit3 className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="h-14 w-14 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
        onClick={onApprove}
        disabled={disabled}
        title="Approve (swipe right)"
      >
        <Check className="h-6 w-6" />
      </Button>
    </div>
  );
}
