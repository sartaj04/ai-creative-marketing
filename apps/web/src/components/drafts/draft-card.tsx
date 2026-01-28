'use client';

import { Draft } from '@/lib/api/drafts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { Calendar, Edit3, GripVertical, Sparkles, Clock, ExternalLink } from 'lucide-react';

interface DraftCardProps {
  draft: Draft;
  onEdit: (draft: Draft) => void;
  onSchedule: (draft: Draft) => void;
  isDragging?: boolean;
}

export function DraftCard({ draft, onEdit, onSchedule, isDragging }: DraftCardProps) {
  const confidenceColor =
    draft.confidence >= 0.8
      ? 'text-green-600'
      : draft.confidence >= 0.6
      ? 'text-blue-600'
      : 'text-muted-foreground';

  return (
    <Card
      className={cn(
        'cursor-grab transition-shadow hover:shadow-md',
        isDragging && 'rotate-2 shadow-lg opacity-90'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <div className="flex flex-wrap items-center gap-2">
              {draft.topic && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {draft.topic}
                </span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                {draft.format}
              </span>
            </div>
          </div>
          <div className={cn('flex items-center gap-1 text-xs', confidenceColor)}>
            <Sparkles className="h-3 w-3" />
            <span>{Math.round(draft.confidence * 100)}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <h4 className="font-medium leading-tight line-clamp-2">{draft.hook}</h4>
        <p className="text-sm text-muted-foreground line-clamp-3">{truncate(draft.body, 120)}</p>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {draft.scheduled_at ? (
              <>
                <Calendar className="h-3 w-3" />
                <span>{new Date(draft.scheduled_at).toLocaleDateString()}</span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(draft.created_at)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {draft.status === 'approved' && (
              <Button variant="ghost" size="sm" onClick={() => onSchedule(draft)}>
                <Calendar className="h-3 w-3 mr-1" />
                Schedule
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(draft)}>
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {draft.platform && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span className="capitalize">{draft.platform}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
