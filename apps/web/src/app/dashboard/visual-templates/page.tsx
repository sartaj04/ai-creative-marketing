'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
    Palette, Search, Loader2, Trash2, Upload, FileImage,
    Sparkles, Eye, Image as ImageIcon, LayoutGrid, Plus, Filter,
} from 'lucide-react';
import {
    visualTemplatesApi,
    type VisualTemplate,
    type VisualTemplateDraft,
} from '@/lib/api/visual-templates';
import { getErrorMessage } from '@/lib/api/client';
import { TemplatePreview } from '@/components/media/template-preview';
import { TemplateDraftReviewModal } from '@/components/media/template-draft-review-modal';

// ── Page ────────────────────────────────────────────────────────────
export default function AdminVisualTemplatesPage() {
    const { toast } = useToast();

    // Templates state
    const [templates, setTemplates] = useState<VisualTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'carousel'>('all');

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStage, setUploadStage] = useState('');
    const [uploadType, setUploadType] = useState<'image' | 'carousel'>('image');
    const [uploadAspectRatio, setUploadAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<VisualTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Preview & Draft modal state
    const [draftTemplate, setDraftTemplate] = useState<VisualTemplateDraft | VisualTemplate | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    // ── Load templates ──────────────────────────────────────────────
    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = { limit: 100 };
            if (typeFilter !== 'all') params.type = typeFilter;
            const res = await visualTemplatesApi.list(params);
            setTemplates(res.templates);
        } catch (err) {
            toast({ title: 'Failed to load templates', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [typeFilter, toast]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // ── Filtered templates ──────────────────────────────────────────
    const filtered = templates.filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q));
    });

    // ── Upload handler ──────────────────────────────────────────────
    const handleUploadGenerate = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        setUploadStage('🔍 Analyzing layout...');
        try {
            const stageTimer = setInterval(() => {
                setUploadStage((prev) => {
                    if (prev.includes('Analyzing')) return '🎨 Generating HTML/CSS...';
                    if (prev.includes('HTML')) return '🖼️ Sourcing images...';
                    if (prev.includes('Sourcing')) return '🔎 Reviewing quality...';
                    return prev;
                });
            }, 8000);

            const draft = await visualTemplatesApi.generate(uploadFile, uploadType, uploadAspectRatio);
            clearInterval(stageTimer);

            toast({ title: 'Draft generated!', description: 'Please review and approve the template.' });
            setUploadFile(null);
            setEditingTemplateId(null);
            setDraftTemplate(draft);
        } catch (err) {
            toast({ title: 'Generation failed', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsUploading(false);
            setUploadStage('');
        }
    };

    // ── Save Draft handler ──────────────────────────────────────────
    const handleSaveDraft = async (updatedDraft: VisualTemplateDraft | VisualTemplate) => {
        setIsSavingDraft(true);
        try {
            if (editingTemplateId) {
                await visualTemplatesApi.update(editingTemplateId, { ...updatedDraft });
                toast({ title: 'Template updated!', description: `"${updatedDraft.name}" has been updated.` });
            } else {
                await visualTemplatesApi.create({ ...updatedDraft });
                toast({ title: 'Template saved!', description: `"${updatedDraft.name}" has been added to your visual templates.` });
            }
            setDraftTemplate(null);
            setEditingTemplateId(null);
            await loadTemplates();
        } catch (err) {
            toast({ title: 'Failed to save template', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsSavingDraft(false);
        }
    };

    // ── Delete handler ──────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await visualTemplatesApi.delete(deleteTarget.id);
            toast({ title: 'Template deleted', description: `"${deleteTarget.name}" has been removed.` });
            setDeleteTarget(null);
            await loadTemplates();
        } catch (err) {
            toast({ title: 'Delete failed', description: getErrorMessage(err), variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Palette className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Visual Templates</h1>
                        <p className="text-sm text-muted-foreground">Manage system image & carousel templates</p>
                    </div>
                </div>
            </div>

            {/* ── Upload Section ──────────────────────────────────── */}
            <Card className="mb-6 border-2 border-dashed border-violet-200 bg-violet-50/30">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        {/* File input */}
                        <div className="flex-1">
                            <p className="text-sm font-medium mb-2 text-violet-900">Generate Template from Image</p>
                            <label
                                className={cn(
                                    'flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                                    uploadFile
                                        ? 'border-emerald-400 bg-emerald-50'
                                        : 'border-slate-200 hover:border-violet-300 hover:bg-white',
                                )}
                            >
                                {uploadFile ? (
                                    <>
                                        <FileImage className="h-5 w-5 text-emerald-600 shrink-0" />
                                        <span className="text-sm font-medium text-emerald-700 truncate">{uploadFile.name}</span>
                                        <button
                                            onClick={(e) => { e.preventDefault(); setUploadFile(null); }}
                                            className="ml-auto text-xs text-muted-foreground hover:text-red-500"
                                        >
                                            Remove
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                                        <div>
                                            <span className="text-sm text-muted-foreground">Drop image/PDF or click to browse</span>
                                            <span className="text-xs text-muted-foreground/60 ml-2">Max 10MB</span>
                                        </div>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    disabled={isUploading}
                                />
                            </label>
                        </div>

                        {/* Type selector */}
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-1.5 h-11 items-center">
                                {(['image', 'carousel'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setUploadType(t)}
                                        className={cn(
                                            'px-3 py-2 rounded-lg text-xs font-medium border transition-colors h-full flex items-center justify-center',
                                            uploadType === t
                                                ? 'border-violet-500 bg-violet-100 text-violet-700'
                                                : 'border-slate-200 text-muted-foreground hover:border-violet-300',
                                        )}
                                    >
                                        {t === 'image' ? '🖼️ Image' : '📱 Carousel'}
                                    </button>
                                ))}
                            </div>

                            {/* Aspect Ratio Selector - Only for Images */}
                            {uploadType === 'image' && (
                                <div className="flex gap-1.5 h-8 items-center mt-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Ratio:</span>
                                    {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => setUploadAspectRatio(ratio)}
                                            className={cn(
                                                'px-2 py-1 rounded bg-slate-50 border text-[11px] font-medium transition-colors',
                                                uploadAspectRatio === ratio
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500/20'
                                                    : 'border-slate-200 text-slate-500 hover:border-violet-300',
                                            )}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Generate button */}
                        <Button
                            onClick={handleUploadGenerate}
                            disabled={!uploadFile || isUploading}
                            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 h-11 px-5"
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {isUploading ? 'Generating...' : 'Generate Template'}
                        </Button>
                    </div>

                    {/* Progress */}
                    {isUploading && uploadStage && (
                        <div className="flex items-center gap-2 mt-3 bg-violet-100 rounded-lg px-3 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                            <span className="text-xs text-violet-700 font-medium">{uploadStage}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Filters ────────────────────────────────────────── */}
            <div className="flex gap-3 items-center mb-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-9"
                    />
                </div>
                <div className="flex gap-1">
                    {(['all', 'image', 'carousel'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                                typeFilter === t
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-slate-200 text-muted-foreground hover:border-slate-300',
                            )}
                        >
                            {t === 'all' ? 'All' : t === 'image' ? 'Images' : 'Carousels'}
                        </button>
                    ))}
                </div>
                <Badge variant="secondary" className="text-xs">
                    {filtered.length} template{filtered.length !== 1 && 's'}
                </Badge>
            </div>

            {/* ── Template Grid ───────────────────────────────────── */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Filter className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No templates found</h3>
                    <p className="text-sm text-muted-foreground">
                        {search || typeFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Upload an image to generate your first visual template'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-auto flex-1 pb-4">
                    {filtered.map((template) => (
                        <Card
                            key={template.id}
                            className="group relative overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => {
                                setEditingTemplateId(template.id);
                                setDraftTemplate(template);
                            }}
                        >
                            {/* Preview */}
                            <div className="h-40 relative bg-slate-50 overflow-hidden">
                                <TemplatePreview
                                    htmlTemplate={template.html_template}
                                    previewUrl={template.preview_url}
                                    slides={template.slides}
                                    defaultValues={template.default_values || {}}
                                    dimensions={template.dimensions || { width: 1080, height: 1080 }}
                                    type={template.type}
                                    slideCount={template.slide_count}
                                    variant="card"
                                />
                            </div>

                            {/* Info */}
                            <CardContent className="p-2.5 space-y-1">
                                <p className="text-xs font-medium truncate">{template.name}</p>
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {template.type}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {template.category}
                                    </Badge>
                                    {template.tags.includes('ai-generated') && (
                                        <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200">
                                            AI
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>

                            {/* Delete button (hover) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(template);
                                }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                title="Delete template"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {/* System badge */}
                            {template.is_system && (
                                <div className="absolute top-2 left-2">
                                    <Badge className="text-[10px] bg-blue-500/80 backdrop-blur-sm">System</Badge>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Delete Confirmation Dialog ─────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-5 w-5" />
                            Delete Template
                        </DialogTitle>
                    </DialogHeader>
                    {deleteTarget && (
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                                Are you sure you want to permanently delete this template?
                            </p>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border shrink-0">
                                    <TemplatePreview
                                        htmlTemplate={deleteTarget.html_template}
                                        previewUrl={deleteTarget.preview_url}
                                        defaultValues={deleteTarget.default_values || {}}
                                        dimensions={deleteTarget.dimensions || { width: 1080, height: 1080 }}
                                        variant="card"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{deleteTarget.name}</p>
                                    <p className="text-xs text-muted-foreground">{deleteTarget.type} • {deleteTarget.category}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            {/* ── Interactive Draft Review Modal ─────────────────────────────────── */}
            <TemplateDraftReviewModal
                open={!!draftTemplate}
                onOpenChange={(open) => {
                    if (!open) {
                        setDraftTemplate(null);
                        setEditingTemplateId(null);
                    }
                }}
                draft={draftTemplate}
                isSaving={isSavingDraft}
                onSave={handleSaveDraft}
                onDiscard={() => {
                    setDraftTemplate(null);
                    setEditingTemplateId(null);
                }}
            />
        </div>
    );
}
