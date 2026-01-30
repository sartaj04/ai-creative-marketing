import { Linkedin, Twitter } from 'lucide-react';
import { Draft } from '@/lib/api/drafts';

export function PlatformBadge({ draft }: { draft: Draft }) {
    const platform = draft.platform;
    if (platform === 'linkedin') {
        return (
            <span className="text-[10px] font-bold px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1">
                <Linkedin className="w-3 h-3" /> LINKEDIN
            </span>
        );
    }
    if (platform === 'twitter') {
        return (
            <span className="text-[10px] font-bold px-2 py-1 rounded border bg-sky-50 text-sky-700 border-sky-100 flex items-center gap-1">
                <Twitter className="w-3 h-3" /> TWITTER
            </span>
        );
    }
    return (
        <span className="text-[10px] font-bold px-2 py-1 rounded border bg-slate-50 text-slate-600 border-slate-200 uppercase">
            {draft.format}
        </span>
    );
}
