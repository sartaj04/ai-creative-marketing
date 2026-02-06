'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, GraduationCap, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

import { Timeline, TimelineEvent } from '@/lib/api/identity';

interface CareerTimelineProps {
    timeline: Timeline;
    onEventUpdate?: (eventId: string, field: string, value: any) => void;
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function EventCard({ event, onUpdate }: { event: TimelineEvent; onUpdate?: (field: string, value: any) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const isWork = event.event_type === 'work';
    const isEducation = event.event_type === 'education';

    const accentColor = isEducation ? 'emerald' : 'indigo';
    const Icon = isEducation ? GraduationCap : Briefcase;

    const startEdit = (field: string, currentValue: string) => {
        setEditing(field);
        setEditValue(currentValue || '');
    };

    const saveEdit = () => {
        if (editing && onUpdate) {
            onUpdate(editing, editValue);
        }
        setEditing(null);
    };

    const cancelEdit = () => {
        setEditing(null);
        setEditValue('');
    };

    const period = [
        formatDate(event.start_date),
        event.is_current ? 'Present' : formatDate(event.end_date),
    ].filter(Boolean).join(' — ');

    return (
        <div className="relative pl-8">
            {/* Timeline dot */}
            <div className={`absolute left-0 top-2 w-4 h-4 rounded-full border-2 border-${accentColor}-400 bg-white z-10`}>
                <div className={`absolute inset-1 rounded-full bg-${accentColor}-400`} />
            </div>

            <div
                className={`bg-white rounded-xl border border-slate-200 hover:border-${accentColor}-200 transition-colors cursor-pointer`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <Icon className={`w-4 h-4 text-${accentColor}-500 flex-shrink-0`} />
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                                {event.title}
                            </h4>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {period && (
                                <span className="text-xs text-slate-400">{period}</span>
                            )}
                            {expanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    {event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {event.tags.slice(0, 4).map((tag, i) => (
                                <span
                                    key={i}
                                    className={`text-[10px] px-2 py-0.5 rounded-full bg-${accentColor}-50 text-${accentColor}-700`}
                                >
                                    {tag}
                                </span>
                            ))}
                            {event.tags.length > 4 && (
                                <span className="text-[10px] text-slate-400">+{event.tags.length - 4}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                                {/* Description */}
                                {event.description && (
                                    <div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                                    </div>
                                )}

                                {/* Emotional Core */}
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Why it mattered</span>
                                        {onUpdate && editing !== 'emotional_core' && (
                                            <button
                                                onClick={() => startEdit('emotional_core', event.emotional_core || '')}
                                                className="text-slate-300 hover:text-slate-500"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {editing === 'emotional_core' ? (
                                        <div className="flex gap-1">
                                            <textarea
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="flex-1 text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-400 focus:border-transparent resize-none"
                                                rows={2}
                                                autoFocus
                                            />
                                            <div className="flex flex-col gap-1">
                                                <button onClick={saveEdit} className="text-green-500 hover:text-green-700">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic">
                                            {event.emotional_core || 'Not yet described — click edit to add'}
                                        </p>
                                    )}
                                </div>

                                {/* Lessons Learned */}
                                {event.lessons_learned.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Key lessons</span>
                                        <ul className="mt-1 space-y-0.5">
                                            {event.lessons_learned.map((lesson, i) => (
                                                <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                                                    <span className="text-slate-300 mt-0.5">•</span>
                                                    {lesson}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export function CareerTimeline({ timeline, onEventUpdate }: CareerTimelineProps) {
    if (!timeline || timeline.events.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-slate-400">
                No career timeline data yet. Submit your LinkedIn profile to build your timeline.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Narrative Arc */}
            {timeline.narrative_arc && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Career Story</span>
                    <p className="text-sm text-slate-700 leading-relaxed mt-1">{timeline.narrative_arc}</p>
                </div>
            )}

            {/* Content Focus */}
            {timeline.primary_focus && (
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Content Focus</span>
                    <p className="text-sm text-indigo-700 mt-1">{timeline.primary_focus}</p>
                </div>
            )}

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-slate-200" />

                <div className="space-y-3">
                    {timeline.events.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            onUpdate={onEventUpdate ? (field, value) => onEventUpdate(event.id, field, value) : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
