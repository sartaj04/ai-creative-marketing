'use client';

import { Label } from '@/components/ui/label';

export const GOALS = [
    { value: 'thought_leadership', label: 'Establish thought leadership' },
    { value: 'engagement', label: 'Drive engagement and discussion' },
    { value: 'educate', label: 'Educate my audience' },
    { value: 'inspire', label: 'Inspire and motivate' },
    { value: 'share_experience', label: 'Share a personal experience' },
    { value: 'promote', label: 'Promote something' },
    { value: 'build_community', label: 'Build community and connection' },
    { value: 'showcase_expertise', label: 'Showcase my expertise' },
    { value: 'debunk_myth', label: 'Debunk a common myth' },
    { value: 'provide_value', label: 'Provide quick value/tips' },
    { value: 'start_conversation', label: 'Start a conversation' },
    { value: 'share_insights', label: 'Share insights and learnings' },
    { value: 'build_authority', label: 'Build authority in my field' },
];

interface GoalSelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function GoalSelector({ value, onChange, disabled = false }: GoalSelectorProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="goal">What's your goal for this post?</Label>
            <select
                id="goal"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                        {g.label}
                    </option>
                ))}
            </select>
            <p className="text-xs text-slate-500">
                This helps us recommend the best templates for your content
            </p>
        </div>
    );
}
