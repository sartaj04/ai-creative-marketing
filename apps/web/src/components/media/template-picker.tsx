'use client';

import { useState, useEffect } from 'react';
import { VisualTemplate, visualTemplatesApi } from '@/lib/api/visual-templates';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Image, LayoutGrid, Loader2 } from 'lucide-react';

interface TemplatePickerProps {
    type: 'image' | 'carousel';
    selectedTemplateId: string | null;
    onSelect: (template: VisualTemplate) => void;
    disabled?: boolean;
}

const CATEGORIES = [
    { value: '', label: 'All' },
    { value: 'quote', label: 'Quote' },
    { value: 'stat', label: 'Stats' },
    { value: 'tips', label: 'Tips' },
    { value: 'story', label: 'Story' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'checklist', label: 'Checklist' },
];

export function TemplatePicker({ type, selectedTemplateId, onSelect, disabled }: TemplatePickerProps) {
    const [templates, setTemplates] = useState<VisualTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        loadTemplates();
    }, [type, category, search]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await visualTemplatesApi.list({
                type,
                category: category || undefined,
                search: search || undefined,
                limit: 50,
            });
            setTemplates(response.templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="pl-9"
                    disabled={disabled}
                />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                    <Badge
                        key={cat.value}
                        variant={category === cat.value ? 'default' : 'outline'}
                        className={cn(
                            'cursor-pointer transition-colors',
                            category === cat.value
                                ? 'bg-cyan-600 hover:bg-cyan-500'
                                : 'hover:bg-slate-100'
                        )}
                        onClick={() => !disabled && setCategory(cat.value)}
                    >
                        {cat.label}
                    </Badge>
                ))}
            </div>

            {/* Template grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No templates found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            className={cn(
                                'cursor-pointer transition-all hover:shadow-md hover:border-cyan-300',
                                selectedTemplateId === template.id && 'ring-2 ring-cyan-500 border-cyan-500',
                                disabled && 'opacity-50 pointer-events-none'
                            )}
                            onClick={() => onSelect(template)}
                        >
                            <CardContent className="p-3">
                                {/* Preview thumbnail */}
                                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                                    {template.preview_url ? (
                                        <img
                                            src={template.preview_url}
                                            alt={template.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="text-center">
                                            {type === 'carousel' ? (
                                                <LayoutGrid className="h-8 w-8 text-slate-400" />
                                            ) : (
                                                <Image className="h-8 w-8 text-slate-400" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Name and metadata */}
                                <h4 className="text-xs font-medium truncate">{template.name}</h4>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                        {template.category}
                                    </span>
                                    {template.slide_count && (
                                        <span className="text-[10px] text-muted-foreground">
                                            · {template.slide_count} slides
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
