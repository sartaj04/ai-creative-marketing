'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  defaultDropAnimationSideEffects,
  DropAnimation,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlatformBadge } from './platform-badge';
import { Draft, DraftStatus } from '@/lib/api/drafts';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLUMN_CONFIG: { id: DraftStatus; title: string; color: string }[] = [
  { id: 'inbox', title: 'Drafts', color: 'bg-slate-500' },
  { id: 'approved', title: 'Approved', color: 'bg-emerald-500' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-purple-500' },
  { id: 'published', title: 'Published', color: 'bg-blue-500' },
];

interface KanbanBoardProps {
  drafts: Draft[];
  onStatusChange: (draftId: string, newStatus: DraftStatus) => Promise<void>;
  onEdit: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
}

export function KanbanBoard({
  drafts,
  onStatusChange,
  onEdit,
  onDelete,
}: KanbanBoardProps) {
  const [items, setItems] = useState<Record<DraftStatus, Draft[]>>({
    inbox: [],
    approved: [],
    scheduled: [],
    published: [],
    rejected: [],
  });
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);

  useEffect(() => {
    const grouped: Record<DraftStatus, Draft[]> = {
      inbox: [],
      approved: [],
      scheduled: [],
      published: [],
      rejected: [],
    };
    drafts.forEach((d) => {
      if (grouped[d.status]) {
        grouped[d.status].push(d);
      } else if (d.status) {
        if (!grouped[d.status]) grouped[d.status] = [];
        grouped[d.status].push(d);
      }
    });
    setItems(grouped);
  }, [drafts]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as { draft: Draft };
    if (activeData?.draft) {
      setActiveDraft(activeData.draft);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Prevent dragging over/into 'scheduled' column
    const overId = over.id;
    const findContainer = (id: string | number): DraftStatus | undefined => {
      if (id in items) return id as DraftStatus;
      return Object.keys(items).find((key) =>
        items[key as DraftStatus].find((item) => item.id === id)
      ) as DraftStatus | undefined;
    };

    // Check if overId is directly a container ID
    let overContainer = findContainer(overId);
    if (!overContainer && (overId in items)) {
      overContainer = overId as DraftStatus;
    }

    if (overContainer === 'scheduled') return;

    const activeId = active.id;
    const activeContainer = findContainer(activeId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      // Use fallback to empty array if container is empty/undefined in state to avoid crash
      const overItems = prev[overContainer!] || [];

      const activeIndex = activeItems.findIndex((i) => i.id === activeId);
      const overIndex = overItems.findIndex((i) => i.id === overId);

      let newIndex;
      if (overId in prev) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top >
          over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [
          ...prev[activeContainer].filter((item) => item.id !== activeId),
        ],
        [overContainer!]: [
          ...prev[overContainer!].slice(0, newIndex),
          items[activeContainer][activeIndex],
          ...prev[overContainer!].slice(newIndex, prev[overContainer!].length),
        ],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id;
    setActiveDraft(null);

    if (!over) return;

    const findContainer = (id: string | number): DraftStatus | undefined => {
      if (id in items) return id as DraftStatus;
      return Object.keys(items).find((key) =>
        items[key as DraftStatus].find((item) => item.id === id)
      ) as DraftStatus | undefined;
    };

    let overContainer = findContainer(over.id);
    if (!overContainer && (over.id in items)) {
      overContainer = over.id as DraftStatus;
    }

    // Prevent dropping in scheduled
    if (overContainer === 'scheduled') return;

    if (overContainer) {
      const originalStatus = drafts.find(d => d.id === activeId)?.status;
      if (originalStatus && originalStatus !== overContainer) {
        try {
          await onStatusChange(activeId as string, overContainer);
        } catch (e) {
          console.error("Failed to update status", e);
        }
      }
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 h-full p-1 overflow-x-auto">
        {COLUMN_CONFIG.map((col) => (
          <DroppableColumn
            key={col.id}
            col={col}
            items={items[col.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeDraft ? <DraftCard draft={activeDraft} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

interface DroppableColumnProps {
  col: { id: DraftStatus; title: string; color: string };
  items: Draft[];
  onEdit: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
}

function DroppableColumn({ col, items, onEdit, onDelete }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: col.id,
  });

  const isScheduled = col.id === 'scheduled';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full bg-slate-50 rounded-xl border-2 border-slate-200 ${isScheduled ? 'opacity-60 bg-slate-100/50' : ''}`}
    >
      <div className="flex items-center gap-2 p-4 border-b border-slate-200">
        <div className={`w-2 h-2 rounded-full ${col.color}`} />
        <h3 className="font-semibold text-sm text-slate-700">
          {col.title}
        </h3>
        <span className="text-slate-400 text-xs font-medium ml-auto">
          {items.length}
        </span>
      </div>

      <div className="flex-1 p-3 overflow-y-auto min-h-0">
        {isScheduled ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="bg-slate-200/50 rounded-lg border border-slate-200 border-dashed p-4 w-full">
              <p className="text-sm font-medium text-slate-500">Coming Soon</p>
              <p className="text-xs text-slate-400 mt-1">Scheduling is currently under development.</p>
            </div>
          </div>
        ) : (
          <SortableContext
            id={col.id}
            items={items.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 font-medium">Drop items here</p>
              </div>
            )}
            <div className="space-y-3 min-h-[50px]">
              {items.map((draft) => (
                <SortableDraftCard
                  key={draft.id}
                  draft={draft}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}


interface SortableDraftCardProps {
  draft: Draft;
  onEdit?: (draft: Draft) => void;
  onDelete?: (draft: Draft) => void;
}

function SortableDraftCard({ draft, onEdit, onDelete }: SortableDraftCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: draft.id,
    data: {
      draft,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DraftCard draft={draft} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function DraftCard({
  draft,
  isOverlay,
  onEdit,
  onDelete,
}: {
  draft: Draft;
  isOverlay?: boolean;
  onEdit?: (draft: Draft) => void;
  onDelete?: (draft: Draft) => void;
}) {
  return (
    <Card
      className={`border-slate-200 group relative bg-white ${isOverlay ? 'shadow-xl rotate-2 cursor-grabbing' : 'hover:shadow-md hover:border-slate-300 cursor-grab transition-all'
        }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <PlatformBadge draft={draft} />
          {!isOverlay && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3 w-3 text-slate-400" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(draft)}>
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(draft)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm font-semibold leading-relaxed text-slate-800 line-clamp-3">
          {draft.hook || draft.topic || 'Untitled Draft'}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-slate-50 mt-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            {formatRelativeTime(draft.created_at)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
