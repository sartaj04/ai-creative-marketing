'use client';

import { useEffect, useState } from 'react';
import {
  templatesApi,
  Template,
  TemplateCategory,
  TemplateScope,
} from '@/lib/api/templates';
import { DraftFormat } from '@/lib/api/drafts';
import { TemplateCard } from '@/components/templates/template-card';
import { TemplateEditor } from '@/components/templates/template-editor';
import { AdminTemplateEditor } from '@/components/templates/admin-template-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  LayoutTemplate,
  RefreshCw,
  Shield,
  Share2,
} from 'lucide-react';

const categories: { value: TemplateCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'myth_buster', label: 'Myth Buster' },
  { value: 'tips', label: 'Tips' },
  { value: 'story', label: 'Story' },
  { value: 'framework', label: 'Framework' },
  { value: 'contrarian', label: 'Contrarian' },
  { value: 'lessons', label: 'Lessons' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'question', label: 'Question' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'case_study', label: 'Case Study' },
];

const formats: { value: DraftFormat | ''; label: string }[] = [
  { value: '', label: 'All Formats' },
  { value: 'post', label: 'Post' },
  { value: 'thread', label: 'Thread' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'article', label: 'Article' },
];

const scopes: { value: TemplateScope | ''; label: string }[] = [
  { value: '', label: 'All Templates' },
  { value: 'system', label: 'Platform Templates' },
  { value: 'user', label: 'My Templates' },
  { value: 'contributed', label: 'Community' },
];

export default function TemplatesPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | ''>('');
  const [formatFilter, setFormatFilter] = useState<DraftFormat | ''>('');
  const [scopeFilter, setScopeFilter] = useState<TemplateScope | ''>('');

  // Editor states
  const [editorOpen, setEditorOpen] = useState(false);
  const [adminEditorOpen, setAdminEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [contributeConfirmOpen, setContributeConfirmOpen] = useState(false);
  const [contributingTemplate, setContributingTemplate] = useState<Template | null>(null);

  const isAdmin = user?.is_admin || false;

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (categoryFilter) params.category = categoryFilter;
      if (formatFilter) params.format = formatFilter;
      if (scopeFilter) params.scope = scopeFilter;

      const response = await templatesApi.list(params);
      setTemplates(response.templates);
    } catch (error) {
      toast({
        title: 'Failed to load templates',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, formatFilter, scopeFilter]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleCreateSystemTemplate = () => {
    setEditingTemplate(null);
    setAdminEditorOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    if (template.is_system && isAdmin) {
      setAdminEditorOpen(true);
    } else {
      setEditorOpen(true);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      await templatesApi.duplicate(template.id);
      toast({
        title: 'Template duplicated',
        description: 'A copy has been created.',
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Failed to duplicate',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (template: Template) => {
    setDeletingTemplate(template);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await templatesApi.delete(deletingTemplate.id);
      toast({
        title: 'Template deleted',
        description: 'The template has been removed.',
      });
      setDeleteConfirmOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Failed to delete',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleContribute = (template: Template) => {
    setContributingTemplate(template);
    setContributeConfirmOpen(true);
  };

  const confirmContribute = async () => {
    if (!contributingTemplate) return;

    try {
      await templatesApi.contribute(contributingTemplate.id);
      toast({
        title: 'Template submitted',
        description: 'Your template has been submitted for review. You\'ll be notified when it\'s approved.',
      });
      setContributeConfirmOpen(false);
      setContributingTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Failed to submit',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleWithdrawContribution = async (template: Template) => {
    try {
      await templatesApi.withdrawContribution(template.id);
      toast({
        title: 'Contribution withdrawn',
        description: 'Your template is now private again.',
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Failed to withdraw',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage content templates for draft generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTemplates} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
          {isAdmin && (
            <Button onClick={handleCreateSystemTemplate} variant="secondary">
              <Shield className="mr-2 h-4 w-4" />
              System Template
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b bg-card/50 px-6 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as TemplateScope | '')}
          className="w-44"
        >
          {scopes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | '')}
          className="w-40"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </Select>

        <Select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as DraftFormat | '')}
          className="w-32"
        >
          {formats.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>

        <span className="text-sm text-muted-foreground">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4">
            <LayoutTemplate className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">No templates found</h2>
            <p className="text-muted-foreground">
              {templates.length === 0
                ? 'Create your first template to get started.'
                : 'No templates match your filters.'}
            </p>
            {templates.length === 0 && (
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                currentUserId={user?.id}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onContribute={handleContribute}
                onWithdrawContribution={handleWithdrawContribution}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Template Editor Modal */}
      <TemplateEditor
        template={editingTemplate}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={fetchTemplates}
      />

      {/* Admin System Template Editor Modal */}
      <AdminTemplateEditor
        template={editingTemplate}
        open={adminEditorOpen}
        onOpenChange={setAdminEditorOpen}
        onSaved={fetchTemplates}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Delete Template</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deletingTemplate?.name}</span>?
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Contribution Confirmation */}
      <Dialog open={contributeConfirmOpen} onOpenChange={setContributeConfirmOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-600" />
            Share Template with Platform
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p>
            Would you like to share{' '}
            <span className="font-semibold">{contributingTemplate?.name}</span>{' '}
            with the Pixo community?
          </p>
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-4 space-y-2">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              What happens when you share:
            </p>
            <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1 list-disc list-inside">
              <li>Your template will be reviewed by our team</li>
              <li>Once approved, it becomes available to all users</li>
              <li>You'll be credited as the creator</li>
              <li>You can withdraw the submission before it's approved</li>
            </ul>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setContributeConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmContribute} className="bg-purple-600 hover:bg-purple-700">
            <Share2 className="mr-2 h-4 w-4" />
            Share Template
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
