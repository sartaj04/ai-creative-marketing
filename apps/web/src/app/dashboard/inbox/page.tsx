'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { X, Check, Edit2, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
import { SwipeableCard, SwipeableCardHandle } from './components/swipeable-card';
import { draftsApi, Draft } from '@/lib/api/drafts';
import { generatorsApi } from '@/lib/api/generators';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

export default function InboxPage() {
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();
    const [cards, setCards] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editDraft, setEditDraft] = useState<Draft | null>(null);
    const [editHook, setEditHook] = useState('');
    const [editBody, setEditBody] = useState('');

    // Map to hold references to card components for imperative actions (buttons)
    const cardRefs = useRef<Map<string, SwipeableCardHandle>>(new Map());

    const loadInbox = useCallback(async () => {
        if (!currentProfile) return;
        setIsLoading(true);
        try {
            const response = await draftsApi.list({
                profile_id: currentProfile.id,
                status: 'inbox',
                limit: 20,
                generated_by: 'content_agency'
            });
            setCards(response.drafts);
        } catch (error: any) {
            // Handle 403 and other errors gracefully
            const errorMessage = error?.response?.status === 403
                ? 'Access denied. Please try refreshing the page.'
                : getErrorMessage(error);
            toast({
                title: 'Failed to load inbox',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentProfile, toast]);

    useEffect(() => {
        loadInbox();
    }, [loadInbox]);

    const handleSwipe = async (direction: 'left' | 'right', draft: Draft) => {
        if (isActioning) return;

        // Optimistic update: Remove card immediately
        setCards(prev => prev.filter(c => c.id !== draft.id));

        try {
            if (direction === 'right') {
                await draftsApi.action(draft.id, { action: 'approve' });
                toast({ title: 'Draft approved' });
            } else {
                await draftsApi.action(draft.id, { action: 'reject' });
                toast({ title: 'Draft rejected' });
            }
        } catch (error) {
            // In a real optimistic UI, we might restore the card here, 
            // but for swipe flows it's often better to just show an error toast 
            // than to jerk the card back into view.
            toast({
                title: `Failed to ${direction === 'right' ? 'approve' : 'reject'}`,
                description: getErrorMessage(error),
                variant: 'destructive'
            });
        }
    };

    const handleApproveClick = async () => {
        if (cards.length === 0 || isActioning) return;

        const topCard = cards[0];
        const cardRef = cardRefs.current.get(topCard.id);

        if (cardRef) {
            // Trigger animation on the card
            setIsActioning(true);
            await cardRef.leaveScreen('right');
            setIsActioning(false);
            // handleSwipe will be called by the card's onSwipe callback
        }
    };

    const handleRejectClick = async () => {
        if (cards.length === 0 || isActioning) return;

        const topCard = cards[0];
        const cardRef = cardRefs.current.get(topCard.id);

        if (cardRef) {
            // Trigger animation on the card
            setIsActioning(true);
            await cardRef.leaveScreen('left');
            setIsActioning(false);
            // handleSwipe will be called by the card's onSwipe callback
        }
    };

    const handleEdit = (draft: Draft) => {
        setEditDraft(draft);
        setEditHook(draft.hook);
        setEditBody(draft.body);
    };

    const handleEditSubmit = async () => {
        if (!editDraft || isActioning) return;
        setIsActioning(true);
        try {
            await draftsApi.action(editDraft.id, {
                action: 'edit',
                edited_hook: editHook,
                edited_body: editBody,
            });
            setCards(prev => prev.filter(c => c.id !== editDraft.id));
            setEditDraft(null);
            toast({ title: 'Draft edited and approved' });
        } catch (error) {
            toast({ title: 'Failed to save edit', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsActioning(false);
        }
    };

    const handleGenerateTrending = async () => {
        if (!currentProfile) return;

        // Check if already have 10+ drafts in inbox
        if (cards.length >= 10) {
            toast({
                title: 'Inbox Full',
                description: 'You already have 10+ drafts. Please review existing drafts first.',
                variant: 'destructive'
            });
            return;
        }

        setIsGenerating(true);
        try {
            await generatorsApi.triggerContentAgency(currentProfile.id);
            toast({
                title: '✨ Content is Being Generated!',
                description: 'Pixo is researching trending topics and creating drafts. This may take a minute.',
            });
            // Reload inbox after a delay to show new drafts
            setTimeout(loadInbox, 5000);
        } catch (error: any) {
            const errorMessage = error?.response?.status === 403
                ? 'Access denied. Please try again later.'
                : getErrorMessage(error);
            toast({
                title: '⚠️ Generation Failed',
                description: `${errorMessage}. Please try again later.`,
                variant: 'destructive'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start sm:justify-center bg-slate-50 relative overflow-hidden -mt-4 sm:-mt-6 ml-0 sm:-ml-6 md:-mt-8 md:-ml-8 pt-4 sm:pt-8 pb-8">
            {/* Header */}
            <div className="w-full max-w-5xl mb-6 sm:mb-8 z-10 space-y-2 px-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.25)]">
                            <PixoCharacter />
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Agent Inbox</h1>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                            <Sparkles className="w-3 h-3 text-cyan-600" />
                            {cards.length} {cards.length === 1 ? 'Draft' : 'Drafts'} Ready
                        </div>
                        <p className="text-xs text-slate-500 hidden sm:block">
                            💡 Swipe cards left or right, or use buttons below
                        </p>
                        {cards.length >= 10 && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                                📦 Inbox Full (10/10)
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={handleGenerateTrending}
                        disabled={isGenerating || cards.length >= 10}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Trending Posts
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Card Stack */}
            <div className="relative w-full max-w-5xl h-[500px] sm:h-[600px] flex items-center justify-center z-10 px-6 sm:px-4">
                <AnimatePresence>
                    {cards.map((draft, index) => (
                        <SwipeableCard
                            key={draft.id}
                            ref={(el) => {
                                if (el) cardRefs.current.set(draft.id, el);
                                else cardRefs.current.delete(draft.id);
                            }}
                            draft={draft}
                            index={index}
                            isFront={index === 0}
                            onSwipe={(direction) => handleSwipe(direction, draft)}
                            onApprove={() => { }} // Removed, handled by onSwipe
                            onReject={() => { }} // Removed, handled by onSwipe
                            onEdit={handleEdit} // Pass existing handleEdit
                            isActioning={isActioning}
                        />
                    ))}
                </AnimatePresence>

                {cards.length === 0 && !isLoading && (
                    <div className="text-center space-y-4 sm:space-y-6 animate-fade-in-up px-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto">
                            <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">All caught up!</h3>
                            <p className="text-sm sm:text-base text-slate-500 max-w-xs mx-auto">
                                Great job reviewing. Your agents are researching new opportunities for tomorrow.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                            <Button onClick={loadInbox} variant="outline" className="border-cyan-200 text-cyan-700 hover:bg-cyan-50">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Inbox
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {cards.length > 0 && (
                <div className="flex gap-4 sm:gap-8 mt-6 sm:mt-8 z-10">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:bg-red-50 hover:border-red-200 hover:text-red-500 hover:scale-110 transition-all duration-300"
                        onClick={handleRejectClick}
                        disabled={isActioning}
                    >
                        <X className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white border border-slate-200 shadow-lg shadow-slate-200/50 text-slate-400 hover:text-cyan-600 hover:border-cyan-200 transition-all"
                        onClick={() => handleEdit(cards[0])}
                        disabled={isActioning}
                    >
                        <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-600 hover:scale-110 transition-all duration-300"
                        onClick={handleApproveClick}
                        disabled={isActioning}
                    >
                        <Check className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    </Button>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editDraft} onOpenChange={(open) => { if (!open) setEditDraft(null); }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Draft</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Hook</Label>
                            <Input
                                value={editHook}
                                onChange={(e) => setEditHook(e.target.value)}
                                placeholder="The opening line / hook"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Body</Label>
                            <Textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                placeholder="The main content"
                                className="min-h-[150px] sm:min-h-[200px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setEditDraft(null)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={handleEditSubmit} disabled={isActioning} className="bg-cyan-600 hover:bg-cyan-500 w-full sm:w-auto">
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save &amp; Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
