'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Calendar, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const COLUMNS = [
    { id: 'ideas', title: 'Ideas', color: 'bg-slate-50', items: 3 },
    { id: 'drafting', title: 'Drafting', color: 'bg-cyan-50/50', items: 2 },
    { id: 'review', title: 'Review', color: 'bg-purple-50/50', items: 4 },
    { id: 'scheduled', title: 'Scheduled', color: 'bg-emerald-50/50', items: 1 },
];

const DRAFTS = [
    { id: 1, title: 'The future of agentic workflows', channel: 'LINKEDIN', tag: 'Thought Leadership', author: 'Strategy Agent' },
    { id: 2, title: 'Why founders need to stop ignoring personal brand', channel: 'TWITTER', tag: 'Opinion', author: 'Growth Agent' },
    { id: 3, title: 'How to scale without adding headcount', channel: 'BLOG', tag: 'Case Study', author: 'Content Agent' },
];

export default function DraftsPage() {
    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-8 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content Pipeline</h1>
                    <p className="text-slate-500">Manage your content generation workflow</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        Calendar View
                    </Button>
                    <Button className="bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20">
                        <Plus className="w-4 h-4 mr-2" />
                        New Idea
                    </Button>
                </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-8 h-full">
                {COLUMNS.map((col) => (
                    <div key={col.id} className="min-w-[320px] flex flex-col bg-slate-100/50 rounded-xl p-4 border border-slate-200">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-600">{col.title}</h3>
                                <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-200 font-mono font-medium">{col.items}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-200/50 rounded-full">
                                <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                            {Array.from({ length: col.items }).map((_, i) => {
                                const draft = DRAFTS[i % DRAFTS.length];
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card className="cursor-grab active:cursor-grabbing hover:shadow-lg transition-all border-slate-200 hover:border-cyan-300 group">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${draft.channel === 'LINKEDIN' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            draft.channel === 'TWITTER' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                                                'bg-orange-50 text-orange-700 border-orange-100'
                                                        }`}>
                                                        {draft.channel}
                                                    </span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                </div>

                                                <p className="text-sm font-semibold leading-relaxed text-slate-800 line-clamp-2">
                                                    {draft.title}
                                                </p>

                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[8px] text-white font-bold">
                                                            AI
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-medium truncate max-w-[80px]">{draft.author}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span>2d</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}

                            <Button variant="ghost" className="w-full h-10 text-slate-500 border-2 border-dashed border-slate-200 hover:border-cyan-300 hover:text-cyan-600 hover:bg-cyan-50/30 transition-all font-medium">
                                <Plus className="w-4 h-4 mr-2" /> Add Item
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
