import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface GeneratedDraft {
    draft_id: string;
    hook: string;
    body: string;
    topic: string | null;
    confidence: number;
}

interface GeneratorReviewProps {
    draft: GeneratedDraft;
}

export function GeneratorReview({ draft }: GeneratorReviewProps) {
    return (
        <div className="space-y-6">
            {/* Confidence Badge */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-100">
                <div>
                    <h3 className="font-semibold text-slate-900">{draft.topic || 'Your Draft'}</h3>
                    <p className="text-xs text-slate-500 mt-1">Review your generated post</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg text-sm font-bold border bg-white border-cyan-200 text-cyan-700">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    {Math.round(draft.confidence * 100)}% Match
                </div>
            </div>

            {/* Draft Content */}
            <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200">
                {draft.hook && (
                    <div className="pb-6 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Hook</p>
                        <p className="text-slate-900 leading-relaxed text-xl font-bold">
                            {draft.hook}
                        </p>
                    </div>
                )}
                {draft.body && (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Content</p>
                        <div className="text-slate-600 leading-relaxed prose prose-slate max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2">{children}</ul>,
                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                }}
                            >
                                {draft.body}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
