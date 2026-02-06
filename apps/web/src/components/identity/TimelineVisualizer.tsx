'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Briefcase, GraduationCap, Trophy, AlertTriangle, Star, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TimelineEvent, TimelineEventType } from '@/lib/api/identity';

interface TimelineVisualizerProps {
    events: TimelineEvent[];
    onEventClick?: (event: TimelineEvent) => void;
}

const EventIcon = ({ type }: { type: TimelineEventType }) => {
    switch (type) {
        case 'work': return <Briefcase className="w-5 h-5" />;
        case 'education': return <GraduationCap className="w-5 h-5" />;
        case 'achievement': return <Trophy className="w-5 h-5" />;
        case 'failure': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
        case 'pivot': return <RefreshCw className="w-5 h-5 text-blue-500" />;
        default: return <Star className="w-5 h-5" />;
    }
};

export function TimelineVisualizer({ events, onEventClick }: TimelineVisualizerProps) {
    // Sort events by date descending (newest first)
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return dateB - dateA;
    });

    if (events.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                <p>No timeline events yet. Start by defining your journey.</p>
            </div>
        );
    }

    return (
        <div className="relative border-l-2 border-slate-200 ml-4 md:ml-8 my-8 space-y-8">
            {sortedEvents.map((event, index) => (
                <motion.div
                    key={event.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-8 md:pl-12"
                >
                    {/* Dot on timeline */}
                    <div className={cn(
                        "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-slate-50 bg-white shadow-sm flex items-center justify-center",
                        event.event_type === 'failure' ? "bg-amber-100 border-amber-500" : "bg-slate-100 border-slate-400"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            event.event_type === 'failure' ? "bg-amber-500" : "bg-slate-400"
                        )} />
                    </div>

                    <Card
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer border-slate-200"
                        onClick={() => onEventClick?.(event)}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded-md bg-slate-100 text-slate-600")}>
                                        <EventIcon type={event.event_type} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {formatDate(event.start_date)} {event.end_date ? `- ${formatDate(event.end_date)}` : ''}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-lg text-slate-900 leading-tight">
                                    {event.title}
                                </h3>
                                <p className="text-slate-600 line-clamp-3 text-sm">
                                    {event.description}
                                </p>
                            </div>
                        </div>

                        {/* Metadata Tags */}
                        {event.tags && event.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {event.tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Emotional Core Hint */}
                        {event.emotional_core && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded">
                                <Star className="w-3 h-3" />
                                <span className="italic truncate max-w-xs">{event.emotional_core}</span>
                            </div>
                        )}
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}

function formatDate(dateStr?: string | Date | null) {
    if (!dateStr) return 'Unknown Date';
    try {
        return format(new Date(dateStr), 'MMM yyyy');
    } catch (e) {
        return 'Invalid Date';
    }
}
