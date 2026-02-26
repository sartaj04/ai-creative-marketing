'use client';

import { useState, useEffect } from 'react';
import { VisualTemplate, visualTemplatesApi } from '@/lib/api/visual-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, Palette } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

interface TemplateEditorProps {
    template: VisualTemplate;
    onRender: (variables: Record<string, any>, brandOverrides?: Record<string, string>) => void;
    isRendering?: boolean;
    disabled?: boolean;
}

export function TemplateEditor({ template, onRender, isRendering, disabled }: TemplateEditorProps) {
    const { toast } = useToast();
    const [variables, setVariables] = useState<Record<string, any>>({});
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    // Initialize with default values
    useEffect(() => {
        const defaults = { ...template.default_values };
        const schema = template.variables_schema || {};
        for (const [key, config] of Object.entries(schema)) {
            if (defaults[key] === undefined && (config as any).default !== undefined) {
                defaults[key] = (config as any).default;
            }
        }
        setVariables(defaults);
        setPreviewUrl(null);
    }, [template.id]);

    const handleVariableChange = (key: string, value: string) => {
        setVariables((prev) => ({ ...prev, [key]: value }));
    };

    const handlePreview = async () => {
        setIsPreviewing(true);
        try {
            const response = await visualTemplatesApi.preview(template.id, { variables });
            setPreviewUrl(response.preview_url);
        } catch (error) {
            toast({
                title: 'Preview failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleRender = () => {
        onRender(variables);
    };

    const schema = template.variables_schema || {};
    const variableEntries = Object.entries(schema);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Variable inputs */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Customize Content
                    </h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {variableEntries.map(([key, config]) => {
                            const cfg = config as any;
                            return (
                                <div key={key} className="space-y-1">
                                    <Label htmlFor={`var-${key}`} className="text-xs capitalize">
                                        {key.replace(/_/g, ' ')}
                                        {cfg.required && <span className="text-red-500 ml-0.5">*</span>}
                                    </Label>
                                    {cfg.type === 'color' ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                id={`var-${key}`}
                                                value={variables[key] || cfg.default || '#000000'}
                                                onChange={(e) => handleVariableChange(key, e.target.value)}
                                                className="w-10 h-10 rounded border cursor-pointer"
                                                disabled={disabled}
                                            />
                                            <Input
                                                value={variables[key] || ''}
                                                onChange={(e) => handleVariableChange(key, e.target.value)}
                                                placeholder={cfg.default || '#000000'}
                                                className="flex-1 text-xs font-mono"
                                                disabled={disabled}
                                            />
                                        </div>
                                    ) : cfg.type === 'textarea' ? (
                                        <textarea
                                            id={`var-${key}`}
                                            value={variables[key] || ''}
                                            onChange={(e) => handleVariableChange(key, e.target.value)}
                                            placeholder={cfg.placeholder || `Enter ${key.replace(/_/g, ' ')}`}
                                            maxLength={cfg.maxLength}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                            disabled={disabled}
                                        />
                                    ) : (
                                        <Input
                                            id={`var-${key}`}
                                            value={variables[key] || ''}
                                            onChange={(e) => handleVariableChange(key, e.target.value)}
                                            placeholder={cfg.placeholder || `Enter ${key.replace(/_/g, ' ')}`}
                                            maxLength={cfg.maxLength}
                                            disabled={disabled}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                    </h4>
                    <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Template preview"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <p className="text-xs text-muted-foreground text-center px-4">
                                Click "Preview" to see your customized template
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreview}
                            disabled={disabled || isPreviewing}
                            className="flex-1"
                        >
                            {isPreviewing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Eye className="h-4 w-4 mr-1" />
                            )}
                            Preview
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRender}
                            disabled={disabled || isRendering}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                        >
                            {isRendering ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Use Template
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
