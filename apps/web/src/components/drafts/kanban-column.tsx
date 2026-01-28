'use client';

import { Draft, DraftStatus } from '@/lib/api/drafts';
import { DraftCard } from './draft-card';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: DraftStatus;
  drafts: Draft[];
  onEdit: (draft: Draft) => void;
  onSchedule: (draft: Draft) => void;
  onDragStart: (e: React.DragEvent, draft: Draft) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: DraftStatus) => void;
  isDropTarget?: boolean;
}

const statusColors: Record<DraftStatus, string> = {
  inbox: 'bg-blue-500',
  approved: 'bg-green-500',
  scheduled: 'bg-purple-500',
  published: 'bg-slate-500',
  rejected: 'bg-red-500',
};

export function KanbanColumn({
  title,
  status,
  drafts,
  onEdit,
  onSchedule,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        'flex h-full min-w-[320px] flex-col rounded-lg bg-muted/50 transition-colors',
        isDropTarget && 'bg-primary/10 ring-2 ring-primary ring-offset-2'
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex items-center gap-2 border-b bg-card px-4 py-3 rounded-t-lg">
        <div className={cn('h-2 w-2 rounded-full', statusColors[status])} />
        <h3 className="font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {drafts.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {drafts.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
            No drafts
          </div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              draggable
              onDragStart={(e) => onDragStart(e, draft)}
            >
              <DraftCard
                draft={draft}
                onEdit={onEdit}
                onSchedule={onSchedule}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
