'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LayoutTemplate, Check, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { generatorsApi, TemplateRecommendation } from '@/lib/api/generators';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateSelectorProps {
    profileId: string;
    sourceType: string;
    topicHint?: string;
    goal?: string;  // For scratch mode: thought_leadership, engagement, educate, etc.
    selectedTemplateId: string | null;
    onSelect: (templateId: string | null) => void;
    disabled?: boolean;
}

export function TemplateSelector({
    profileId,
    sourceType,
    topicHint,
    goal,
    selectedTemplateId,
    onSelect,
    disabled = false,
}: TemplateSelectorProps) {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<TemplateRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    // showAll state removed as we show all via scroll

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Common tags based on backend categories and popular topics
    const COMMON_TAGS = [
        // Categories
        'myth_buster', 'story', 'framework', 'tips', 'contrarian',
        'lessons', 'listicle', 'question', 'comparison', 'announcement', 'case_study',
        // Popular Tags
        'ai', 'marketing', 'leadership', 'productivity', 'career',
        'sales', 'strategy', 'personal-branding', 'linkedin'
    ];

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const loadTemplates = useCallback(async () => {
        if (!profileId) return;

        setIsLoading(true);
        try {
            // Fetch all templates for client-side filtering
            const response = await generatorsApi.recommendTemplates({
                profile_id: profileId,
                source_type: sourceType,
                topic_hint: topicHint,
                goal: goal,
                limit: 100,
            });
            setTemplates(response.templates);
        } catch (error) {
            toast({
                title: 'Failed to load templates',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [profileId, sourceType, topicHint, goal, toast]);

    // Initial load
    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // Client-side filtering
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = searchQuery.toLowerCase().trim() === '' ||
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTags = selectedTags.length === 0 ||
            selectedTags.includes(template.category) ||
            // Check if any of the template's specific tags match selected tags (if tags exist)
            (template.tags && Array.isArray(template.tags) && template.tags.some(tag => selectedTags.includes(tag)));

        return matchesSearch && matchesTags;
    });

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Label>Choose a Template (Optional)</Label>
                <div className="flex items-center justify-center py-8 border border-dashed border-slate-200 rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <Label>Choose a Template (Optional)</Label>
                    {selectedTemplateId && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelect(null)}
                            disabled={disabled}
                            className="text-xs text-slate-500 hover:text-slate-700"
                        >
                            Clear selection
                        </Button>
                    )}
                </div>

                {/* Search and Filter */}
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-slate-50"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {COMMON_TAGS.map(tag => (
                            <Badge
                                key={tag}
                                variant={selectedTags.includes(tag) ? "secondary" : "outline"}
                                className={`cursor-pointer capitalize text-xs hover:bg-slate-100 ${selectedTags.includes(tag) ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-200' : 'text-slate-600'
                                    }`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag.replace('_', ' ')}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    {/* No Template Option */}
                    <div
                        onClick={() => !disabled && onSelect(null)}
                        className={`
                            p-3 border rounded-lg cursor-pointer transition-all
                            ${!selectedTemplateId
                                ? 'border-cyan-400 bg-cyan-50/50 ring-1 ring-cyan-400'
                                : 'border-slate-200 hover:border-slate-300'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <LayoutTemplate className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">No template</p>
                                    <p className="text-xs text-slate-500">Generate freely</p>
                                </div>
                            </div>
                            {!selectedTemplateId && (
                                <Check className="w-5 h-5 text-cyan-600" />
                            )}
                        </div>
                    </div>

                    {/* Template Options List */}
                    <div className="space-y-2 h-[500px] overflow-y-auto pr-1">
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => !disabled && onSelect(template.id)}
                                className={`
                                    p-3 border rounded-lg cursor-pointer transition-all
                                    ${selectedTemplateId === template.id
                                        ? 'border-cyan-400 bg-cyan-50/50 ring-1 ring-cyan-400'
                                        : 'border-slate-200 hover:border-slate-300'
                                    }
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-700 truncate">
                                                {template.name}
                                            </p>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                {Math.round(template.match_score * 100)}%
                                            </span>
                                        </div>
                                        {template.description && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                                {template.description}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            <span className="text-[10px] text-slate-400 capitalize px-1 border rounded">
                                                {template.category.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedTemplateId === template.id && (
                                        <Check className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredTemplates.length === 0 && (
                            <div className="text-center py-8 text-sm text-slate-500">
                                No templates match your search.
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Template Preview Panel */}
                <div className="h-full">
                    {selectedTemplate ? (
                        <div className="h-full bg-slate-50 rounded-lg border border-slate-200 flex flex-col overflow-hidden">
                            <div className="px-3 py-2 border-b bg-white text-xs font-medium text-slate-500 flex justify-between items-center">
                                <span>Template Preview</span>
                                <span className="text-slate-400">
                                    {selectedTemplate.usage_count} uses
                                </span>
                            </div>
                            <ScrollArea className="flex-1 p-3">
                                <div className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                    {selectedTemplate.content}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="h-full bg-slate-50/50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center p-6 text-center">
                            <div>
                                <LayoutTemplate className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm text-slate-400">Select a template to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
