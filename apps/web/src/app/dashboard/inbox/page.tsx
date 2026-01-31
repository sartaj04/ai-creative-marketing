'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Card } from '@/components/ui/card';
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
import { X, Check, Edit2, Linkedin, Twitter, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PixoCharacter } from '@/components/auth/PixoCharacter';
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

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const bg = useTransform(x, [-200, 0, 200], ["rgba(239, 68, 68, 0.05)", "rgba(255,255,255,0)", "rgba(8, 145, 178, 0.05)"]);
    const approveOverlayOpacity = useTransform(x, [50, 150], [0, 1]);
    const rejectOverlayOpacity = useTransform(x, [-150, -50], [1, 0]);

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
        } catch (error) {
            toast({ title: 'Failed to load inbox', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [currentProfile, toast]);

    useEffect(() => {
        loadInbox();
    }, [loadInbox]);

    const handleApprove = async (draft: Draft) => {
        if (isActioning) return;
        setIsActioning(true);
        try {
            await draftsApi.action(draft.id, { action: 'approve' });
            setCards(prev => prev.filter(c => c.id !== draft.id));
            toast({ title: 'Draft approved' });
        } catch (error) {
            toast({ title: 'Failed to approve', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsActioning(false);
        }
    };

    const handleReject = async (draft: Draft) => {
        if (isActioning) return;
        setIsActioning(true);
        try {
            await draftsApi.action(draft.id, { action: 'reject' });
            setCards(prev => prev.filter(c => c.id !== draft.id));
            toast({ title: 'Draft rejected' });
        } catch (error) {
            toast({ title: 'Failed to reject', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsActioning(false);
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

    const handleDragEnd = (_event: any, info: any) => {
        if (isActioning || cards.length === 0) return;
        if (info.offset.x > 100) {
            handleApprove(cards[0]);
        } else if (info.offset.x < -100) {
            handleReject(cards[0]);
        }
    };

    const handleGenerateTrending = async () => {
        if (!currentProfile) return;
        setIsGenerating(true);
        try {
            await generatorsApi.triggerContentAgency(currentProfile.id);
            toast({
                title: 'Content Agency Activated!',
                description: 'Pixo is researching trending topics and creating drafts for you.'
            });
            // Reload inbox after a delay to show new drafts
            setTimeout(loadInbox, 3000);
        } catch (error) {
            toast({
                title: 'Failed to trigger agency',
                description: getErrorMessage(error),
                variant: 'destructive'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const getPlatformIcon = (platform: string | null) => {
        if (platform === 'linkedin') return <Linkedin className="w-5 h-5 text-[#0077b5]" />;
        if (platform === 'twitter') return <Twitter className="w-5 h-5 text-[#1DA1F2]" />;
        return <Edit2 className="w-5 h-5 text-slate-400" />;
    };

    const getPlatformLabel = (platform: string | null) => {
        if (platform === 'linkedin') return 'LinkedIn';
        if (platform === 'twitter') return 'Twitter';
        return 'Post';
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
            <motion.div style={{ backgroundColor: bg }} className="absolute inset-0 z-0 transition-colors" />

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
                            Swipe cards left or right, or use buttons below
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerateTrending}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all w-full sm:w-auto text-sm"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 mr-2 relative overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0 flex items-center justify-center [transform:scale(0.15)] animate-bounce">
                                        <PixoCharacter />
                                    </div>
                                </div>
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
                    {cards.map((draft, index) => {
                        const isFront = index === 0;
                        const confidencePercent = Math.round(draft.confidence * 100);
                        return (
                            <motion.div
                                key={draft.id}
                                style={{
                                    zIndex: cards.length - index,
                                    x: isFront ? x : 0,
                                    rotate: isFront ? rotate : 0,
                                    scale: 1 - index * 0.05,
                                    y: index * 15,
                                    opacity: index > 2 ? 0 : 1
                                }}
                                drag={isFront && !isActioning ? "x" : false}
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={handleDragEnd}
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1 - index * 0.05, opacity: index > 2 ? 0 : 1, y: index * 15 }}
                                exit={{ x: x.get() < 0 ? -500 : 500, opacity: 0, transition: { duration: 0.2 } }}
                                className="absolute w-full"
                            >
                                <Card className="h-[480px] sm:h-[550px] w-full shadow-2xl shadow-slate-200/50 border-0 sm:border sm:border-slate-100 flex flex-col overflow-hidden bg-white select-none cursor-grab active:cursor-grabbing rounded-3xl ring-1 ring-slate-900/5">
                                    {/* Card Header */}
                                    <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                                {getPlatformIcon(draft.platform)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{draft.topic || 'Untitled Draft'}</h3>
                                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">{getPlatformLabel(draft.platform)} &bull; {new Date(draft.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold border flex-shrink-0 ${confidencePercent > 90 ? 'bg-green-50 text-green-700 border-green-200' : confidencePercent > 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                            {confidencePercent}%
                                        </div>
                                    </div>

                                    {/* Card Content - Scrollable */}
                                    <div className="px-8 py-4 sm:p-10 flex-1 flex flex-col bg-white overflow-y-auto overscroll-contain">
                                        {(() => {
                                            // Check if body already starts with the hook to avoid duplication
                                            const hookTrimmed = draft.hook.trim();
                                            const bodyTrimmed = draft.body?.trim() || '';

                                            // Check if body starts with hook (case-insensitive, allowing for slight variations)
                                            const hookLower = hookTrimmed.toLowerCase();
                                            const bodyLower = bodyTrimmed.toLowerCase();
                                            const bodyStartsWithHook = hookLower && bodyLower.startsWith(hookLower);

                                            // If body starts with hook, remove it from body to avoid duplication
                                            let displayBody = bodyTrimmed;
                                            if (bodyStartsWithHook && hookTrimmed) {
                                                // Remove the hook from the beginning of body
                                                displayBody = bodyTrimmed.substring(hookTrimmed.length).trim();
                                            }

                                            return (
                                                        <div className="space-y-4 sm:space-y-6 flex-1 flex flex-col">
                                                            {hookTrimmed && (
                                                                <div className="pb-4 sm:pb-6 border-b border-slate-100">
                                                                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Hook</p>
                                                                    <p className="text-slate-900 leading-relaxed text-lg sm:text-2xl font-bold">
                                                                        {hookTrimmed}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {displayBody && (
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Content</p>
                                                                    <div className="text-slate-600 leading-relaxed text-sm sm:text-lg prose prose-slate max-w-none">
                                                                <ReactMarkdown
                                                                    components={{
                                                                        p: ({ children }) => (
                                                                            <p className="mb-4 leading-relaxed">{children}</p>
                                                                        ),
                                                                        strong: ({ children }) => (
                                                                            <strong className="font-semibold text-slate-900">{children}</strong>
                                                                        ),
                                                                        em: ({ children }) => (
                                                                            <em className="italic">{children}</em>
                                                                        ),
                                                                        ul: ({ children }) => (
                                                                            <ul className="list-disc list-outside ml-6 mb-4 space-y-2">{children}</ul>
                                                                        ),
                                                                        ol: ({ children }) => (
                                                                            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">{children}</ol>
                                                                        ),
                                                                        li: ({ children }) => (
                                                                            <li className="leading-relaxed">{children}</li>
                                                                        ),
                                                                        h1: ({ children }) => (
                                                                            <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-4">{children}</h1>
                                                                        ),
                                                                        h2: ({ children }) => (
                                                                            <h2 className="text-xl font-bold text-slate-900 mt-5 mb-3">{children}</h2>
                                                                        ),
                                                                        h3: ({ children }) => (
                                                                            <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">{children}</h3>
                                                                        ),
                                                                        blockquote: ({ children }) => (
                                                                            <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 italic text-slate-600">{children}</blockquote>
                                                                        ),
                                                                        code: ({ children }) => (
                                                                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">{children}</code>
                                                                        ),
                                                                        pre: ({ children }) => (
                                                                            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                                                                        ),
                                                                        a: ({ href, children }) => (
                                                                            <a href={href} className="text-cyan-600 hover:text-cyan-700 underline" target="_blank" rel="noopener noreferrer">{children}</a>
                                                                        ),
                                                                        hr: () => <hr className="my-6 border-slate-200" />,
                                                                    }}
                                                                >
                                                                    {displayBody}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <div className="mt-auto pt-4 sm:pt-6 flex flex-wrap gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                {draft.format}
                                            </span>
                                            {draft.topic && (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium truncate max-w-[200px]">
                                                    #{draft.topic}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Hints Overlay */}
                                    <motion.div style={{ opacity: approveOverlayOpacity }} className="absolute inset-0 bg-cyan-500/90 flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                                        <Check className="w-16 h-16 sm:w-20 sm:h-20 mb-2 sm:mb-4" />
                                        <span className="text-xl sm:text-2xl font-bold tracking-wide uppercase">Approve</span>
                                    </motion.div>
                                    <motion.div style={{ opacity: rejectOverlayOpacity }} className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                                        <X className="w-16 h-16 sm:w-20 sm:h-20 mb-2 sm:mb-4" />
                                        <span className="text-xl sm:text-2xl font-bold tracking-wide uppercase">Reject</span>
                                    </motion.div>
                                </Card>
                            </motion.div>
                        );
                    })}
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
                        onClick={() => handleReject(cards[0])}
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
                        onClick={() => handleApprove(cards[0])}
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
