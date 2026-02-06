'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, ChevronRight, Loader2, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, getErrorMessage } from '@/lib/api/client';

interface PersonalizeAgentCardProps {
    profileId: string;
    writingSamplesCount?: number;
    compact?: boolean;
}

export default function PersonalizeAgentCard({ profileId, writingSamplesCount = 0, compact = false }: PersonalizeAgentCardProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [posts, setPosts] = useState<string[]>(['', '', '']);
    const [visiblePostsCount, setVisiblePostsCount] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostChange = (index: number, value: string) => {
        const newPosts = [...posts];
        newPosts[index] = value;
        setPosts(newPosts);
    };

    const handleAddAnother = () => {
        if (visiblePostsCount < 5) {
            const newCount = visiblePostsCount + 1;
            setVisiblePostsCount(newCount);
            // Add empty string if needed
            if (posts.length < newCount) {
                setPosts([...posts, '']);
            }
        }
    };

    const handleImport = async () => {
        // Filter out empty posts
        const validPosts = posts.filter(post => post.trim().length > 0);

        if (validPosts.length < 3) {
            toast({
                title: 'Insufficient Posts',
                description: 'Please add at least 3 posts',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Import posts
            const importResponse = await apiClient.post(`/profiles/${profileId}/writing-samples`, {
                posts: validPosts,
                platform: 'manual',
            });

            toast({
                title: 'Posts Imported',
                description: `Successfully imported ${importResponse.data.total} posts`,
            });

            // Trigger async analysis (returns immediately)
            try {
                const analysisResponse = await apiClient.post(`/profiles/${profileId}/analyze-writing-samples`, {
                    regenerate_persona: true,
                });

                toast({
                    title: 'Analysis Started',
                    description: 'Your writing style is being analyzed in the background. This may take a few minutes.',
                });
            } catch (error) {
                console.error('Analysis trigger error:', error);
                toast({
                    title: 'Analysis Started',
                    description: 'Analysis queued. Your writing style will be analyzed shortly.',
                });
            }

            setIsOpen(false);
            setPosts(['', '', '']);
            setVisiblePostsCount(3);

            // Reload page to update sample count
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Import error:', error);
            toast({
                title: 'Import Failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filledPostsCount = posts.filter(p => p.trim().length > 0).length;
    const canSubmit = filledPostsCount >= 3;

    // Compact mode: just a button for header
    if (compact) {
        return (
            <>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="bg-white/50 backdrop-blur-sm border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                >
                    <User className="w-4 h-4 mr-2" />
                    {writingSamplesCount > 0 ? `${writingSamplesCount} Samples` : 'Add Voice Samples'}
                </Button>

                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) {
                        setPosts(['', '', '']);
                        setVisiblePostsCount(3);
                    }
                }} >
                    <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <DialogTitle>Personalize Your AI Agent</DialogTitle>
                                    <DialogDescription>
                                        Paste up to 5 of your best LinkedIn or Twitter posts. AI will analyze your writing style, vocabulary,
                                        and formatting preferences to generate content that sounds exactly like you. Minimum 3 required.
                                    </DialogDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-slate-900 -mt-2 -mr-2"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {posts.slice(0, visiblePostsCount).map((post, index) => (
                                <div key={index} className="relative">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="text-sm font-medium text-slate-700">
                                            Post {index + 1} {index < 3 && <span className="text-red-500">*</span>}
                                            {index >= 3 && <span className="text-slate-400 ml-1">(optional)</span>}
                                        </span>
                                    </div>
                                    <Textarea
                                        value={post}
                                        onChange={(e) => handlePostChange(index, e.target.value)}
                                        placeholder="Paste your post here..."
                                        className="min-h-[100px] resize-none text-slate-900"
                                    />
                                </div>
                            ))}

                            {visiblePostsCount < 5 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAddAnother}
                                    className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Another Post (Optional)
                                </Button>
                            )}

                            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                                <p className="font-medium mb-2">Tips for best results:</p>
                                <ul className="list-disc list-inside space-y-1 text-slate-600">
                                    <li>Fill at least 3 posts (required)</li>
                                    <li>Choose posts that represent your authentic voice</li>
                                    <li>Mix different topics or formats if possible</li>
                                    <li>Include posts you're proud of</li>
                                </ul>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">
                                    {filledPostsCount}/5 posts filled ({filledPostsCount >= 3 ? '3+ required' : `need ${3 - filledPostsCount} more`})
                                </span>
                                {canSubmit && (
                                    <span className="text-emerald-600 font-medium">
                                        Ready to analyze
                                    </span>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                                className="text-slate-700 border-slate-200 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleImport}
                                disabled={!canSubmit || isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Import & Analyze'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Full card mode for dashboard
    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card
                    className="border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                    onClick={() => setIsOpen(true)}
                >
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
                                    <User className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 mb-1">
                                        {writingSamplesCount > 0 ? 'Your Writing Style' : 'Personalize Your Agent'}
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-2">
                                        {writingSamplesCount > 0
                                            ? `Analyzed ${writingSamplesCount} of your posts. Add more to improve accuracy.`
                                            : 'Add 3-5 of your posts so AI learns your unique voice and style.'}
                                    </p>
                                    {writingSamplesCount === 0 && (
                                        <div className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                                            <span>Add your posts</span>
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    setPosts(['', '', '']);
                    setVisiblePostsCount(3);
                }
            }} >
                <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <DialogTitle>Personalize Your AI Agent</DialogTitle>
                                <DialogDescription>
                                    Paste up to 5 of your best LinkedIn or Twitter posts. AI will analyze your writing style, vocabulary,
                                    and formatting preferences to generate content that sounds exactly like you. Minimum 3 required.
                                </DialogDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-900 -mt-2 -mr-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {posts.slice(0, visiblePostsCount).map((post, index) => (
                            <div key={index} className="relative">
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="text-sm font-medium text-slate-700">
                                        Post {index + 1} {index < 3 && <span className="text-red-500">*</span>}
                                        {index >= 3 && <span className="text-slate-400 ml-1">(optional)</span>}
                                    </span>
                                </div>
                                <Textarea
                                    value={post}
                                    onChange={(e) => handlePostChange(index, e.target.value)}
                                    placeholder="Paste your post here..."
                                    className="min-h-[100px] resize-none"
                                />
                            </div>
                        ))}

                        {visiblePostsCount < 5 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddAnother}
                                className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another Post (Optional)
                            </Button>
                        )}

                        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                            <p className="font-medium mb-2">Tips for best results:</p>
                            <ul className="list-disc list-inside space-y-1 text-slate-600">
                                <li>Fill at least 3 posts (required)</li>
                                <li>Choose posts that represent your authentic voice</li>
                                <li>Mix different topics or formats if possible</li>
                                <li>Include posts you're proud of</li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                                {filledPostsCount}/5 posts filled ({filledPostsCount >= 3 ? '3+ required' : `need ${3 - filledPostsCount} more`})
                            </span>
                            {canSubmit && (
                                <span className="text-emerald-600 font-medium">
                                    Ready to analyze
                                </span>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isSubmitting}
                            className="text-slate-700 border-slate-200 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleImport}
                            disabled={!canSubmit || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                'Import & Analyze'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
