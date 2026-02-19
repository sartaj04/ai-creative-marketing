'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import { identityApi, type TimelineEvent } from '@/lib/api/identity';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

interface TimelineEventEditDialogProps {
    event: TimelineEvent | null;
    profileId: string;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function TimelineEventEditDialog({ event, profileId, onOpenChange, onSaved }: TimelineEventEditDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [emotionalCore, setEmotionalCore] = useState('');
    const [lessonsLearned, setLessonsLearned] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [newLesson, setNewLesson] = useState('');
    const [newTag, setNewTag] = useState('');
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setDescription(event.description || '');
            setEmotionalCore(event.emotional_core || '');
            setLessonsLearned(event.lessons_learned || []);
            setTags(event.tags || []);
        }
    }, [event]);

    const handleSave = async () => {
        if (!event) return;
        setSaving(true);
        try {
            await identityApi.updateTimelineEvent(profileId, event.id, {
                title,
                description,
                emotional_core: emotionalCore,
                lessons_learned: lessonsLearned,
                tags,
            });
            toast({ title: 'Event updated' });
            onSaved();
            onOpenChange(false);
        } catch (error) {
            toast({ title: 'Failed to update event', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const addLesson = () => {
        if (newLesson.trim()) {
            setLessonsLearned([...lessonsLearned, newLesson.trim()]);
            setNewLesson('');
        }
    };

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    return (
        <Dialog open={!!event} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Timeline Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                    </div>

                    <div className="space-y-2">
                        <Label>Emotional Core</Label>
                        <p className="text-xs text-muted-foreground">Why this moment matters to you — the feeling or insight behind it.</p>
                        <Textarea value={emotionalCore} onChange={(e) => setEmotionalCore(e.target.value)} rows={2} placeholder="What made this moment significant?" />
                    </div>

                    <div className="space-y-2">
                        <Label>Lessons Learned</Label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {lessonsLearned.map((lesson, i) => (
                                <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                                    {lesson}
                                    <button onClick={() => setLessonsLearned(lessonsLearned.filter((_, j) => j !== i))} className="hover:text-destructive">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newLesson}
                                onChange={(e) => setNewLesson(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLesson(); } }}
                                placeholder="Add a lesson..."
                                className="flex-1 text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={addLesson} disabled={!newLesson.trim()}>Add</Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs gap-1 pr-1">
                                    {tag}
                                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                placeholder="Add a tag..."
                                className="flex-1 text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={addTag} disabled={!newTag.trim()}>Add</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving || !title.trim()}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
