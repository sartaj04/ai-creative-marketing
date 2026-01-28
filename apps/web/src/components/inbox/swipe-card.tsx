'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Draft } from '@/lib/api/drafts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { Check, X, Edit3, Sparkles } from 'lucide-react';

interface SwipeCardProps {
  draft: Draft;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (hook: string, body: string, feedback?: string) => void;
  disabled?: boolean;
}

export function SwipeCard({
  draft,
  onApprove,
  onReject,
  onEdit,
  disabled,
}: SwipeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedHook, setEditedHook] = useState(draft.hook);
  const [editedBody, setEditedBody] = useState(draft.body);
  const [feedback, setFeedback] = useState('');

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Background colors for swipe feedback
  const backgroundColor = useTransform(
    x,
    [-200, -50, 0, 50, 200],
    [
      'rgb(239, 68, 68)', // red
      'rgb(255, 255, 255)',
      'rgb(255, 255, 255)',
      'rgb(255, 255, 255)',
      'rgb(34, 197, 94)', // green
    ]
  );

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (disabled) return;

    const threshold = 100;
    if (info.offset.x > threshold) {
      onApprove();
    } else if (info.offset.x < -threshold) {
      onReject();
    }
  };

  const handleSaveEdit = () => {
    onEdit(editedHook, editedBody, feedback);
    setIsEditing(false);
  };

  const confidenceColor =
    draft.confidence >= 0.8
      ? 'text-green-600'
      : draft.confidence >= 0.6
      ? 'text-blue-600'
      : 'text-muted-foreground';

  if (isEditing) {
    return (
      <Card className="absolute inset-0 overflow-hidden">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Edit Draft</span>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Hook</label>
            <Input
              value={editedHook}
              onChange={(e) => setEditedHook(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Body</label>
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="mt-1 min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Feedback (optional)</label>
            <Input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Why did you make these changes?"
              className="mt-1"
            />
          </div>
          <Button onClick={handleSaveEdit} className="w-full">
            Save & Approve
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02 }}
    >
      <motion.div style={{ backgroundColor }} className="h-full rounded-xl">
        <Card className="h-full overflow-hidden bg-card/95 backdrop-blur">
          <CardHeader className="space-y-2 pb-2">
            {/* Topic & Format badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {draft.topic && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {draft.topic}
                  </span>
                )}
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                  {draft.format}
                </span>
              </div>
              <div className={cn('flex items-center space-x-1 text-xs', confidenceColor)}>
                <Sparkles className="h-3 w-3" />
                <span>{Math.round(draft.confidence * 100)}%</span>
              </div>
            </div>

            {/* Hook */}
            <h3 className="text-lg font-semibold leading-tight">{draft.hook}</h3>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Body preview */}
            <div className="max-h-[280px] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {draft.body}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
              <span>{formatRelativeTime(draft.created_at)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={disabled}
              >
                <Edit3 className="mr-1 h-3 w-3" />
                Edit
              </Button>
            </div>
          </CardContent>

          {/* Swipe indicators */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
            <motion.div
              className="rounded-full bg-destructive/20 p-4"
              style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
            >
              <X className="h-8 w-8 text-destructive" />
            </motion.div>
            <motion.div
              className="rounded-full bg-green-500/20 p-4"
              style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
            >
              <Check className="h-8 w-8 text-green-500" />
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
