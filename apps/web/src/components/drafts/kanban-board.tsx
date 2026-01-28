'use client';

import { useState } from 'react';
import { Draft, DraftStatus } from '@/lib/api/drafts';
import { KanbanColumn } from './kanban-column';

interface KanbanBoardProps {
  drafts: Draft[];
  onStatusChange: (draftId: string, newStatus: DraftStatus) => Promise<void>;
  onEdit: (draft: Draft) => void;
  onSchedule: (draft: Draft) => void;
}

const columns: { title: string; status: DraftStatus }[] = [
  { title: 'Approved', status: 'approved' },
  { title: 'Scheduled', status: 'scheduled' },
  { title: 'Published', status: 'published' },
];

export function KanbanBoard({ drafts, onStatusChange, onEdit, onSchedule }: KanbanBoardProps) {
  const [draggedDraft, setDraggedDraft] = useState<Draft | null>(null);
  const [dropTarget, setDropTarget] = useState<DraftStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, draft: Draft) => {
    setDraggedDraft(draft);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draft.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (status: DraftStatus) => {
    setDropTarget(status);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: DraftStatus) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedDraft || draggedDraft.status === newStatus) {
      setDraggedDraft(null);
      return;
    }

    // Validate status transitions
    const validTransitions: Record<DraftStatus, DraftStatus[]> = {
      inbox: ['approved', 'rejected'],
      approved: ['scheduled', 'published'],
      scheduled: ['approved', 'published'],
      published: [],
      rejected: ['approved'],
    };

    if (!validTransitions[draggedDraft.status].includes(newStatus)) {
      setDraggedDraft(null);
      return;
    }

    await onStatusChange(draggedDraft.id, newStatus);
    setDraggedDraft(null);
  };

  const getDraftsByStatus = (status: DraftStatus) => {
    return drafts.filter((d) => d.status === status);
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.status}
          onDragEnter={() => handleDragEnter(column.status)}
          onDragLeave={handleDragLeave}
        >
          <KanbanColumn
            title={column.title}
            status={column.status}
            drafts={getDraftsByStatus(column.status)}
            onEdit={onEdit}
            onSchedule={onSchedule}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDropTarget={dropTarget === column.status}
          />
        </div>
      ))}
    </div>
  );
}
