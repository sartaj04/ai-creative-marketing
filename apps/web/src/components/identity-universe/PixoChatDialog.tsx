'use client';

import { Dialog } from '@/components/ui/dialog';
import { ConversationalOnboarding } from '@/components/onboarding-new/ConversationalOnboarding';

interface PixoChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: () => void;
}

export function PixoChatDialog({ open, onOpenChange, onComplete }: PixoChatDialogProps) {
    const handleComplete = () => {
        onOpenChange(false);
        onComplete();
    };

    const handleBack = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} className="max-w-none w-screen h-screen m-0 p-0 rounded-none">
            <div className="w-full h-full">
                <ConversationalOnboarding
                    onComplete={handleComplete}
                    onBack={handleBack}
                    mode="refinement"
                />
            </div>
        </Dialog>
    );
}
