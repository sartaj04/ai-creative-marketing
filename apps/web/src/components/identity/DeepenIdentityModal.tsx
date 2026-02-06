'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ConversationalOnboarding } from "@/components/onboarding-new/ConversationalOnboarding";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

interface DeepenIdentityModalProps {
    onComplete: () => void;
}

export function DeepenIdentityModal({ onComplete }: DeepenIdentityModalProps) {
    const [open, setOpen] = useState(false);

    const handleComplete = () => {
        setOpen(false);
        onComplete();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <MessageSquarePlus className="w-4 h-4" />
                    Deepen Identity
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>Deepen Your Identity</DialogTitle>
                    <DialogDescription>
                        Chat with Pixo to add more stories and details to your timeline.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden relative">
                    <ConversationalOnboarding
                        mode="refinement"
                        onComplete={handleComplete}
                        onBack={() => setOpen(false)} // Treat back as close
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
