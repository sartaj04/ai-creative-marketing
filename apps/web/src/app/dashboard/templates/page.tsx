'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { AdminTemplateEditor } from '@/components/templates/admin-template-editor';
import { TemplateCard } from '@/components/templates/template-card';
import { templatesApi, Template, TemplateCategory } from '@/lib/api/templates';
import { DraftFormat } from '@/lib/api/drafts';
import { useAuthStore } from '@/stores/auth-store';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';

const categories: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
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

const formats: { value: DraftFormat | 'all'; label: string }[] = [
  { value: 'all', label: 'All Formats' },
  { value: 'post', label: 'Post' },
  { value: 'thread', label: 'Thread' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'article', label: 'Article' },
];

export default function TemplatesPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<DraftFormat | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<boolean | 'all'>('all');

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter, formatFilter, activeFilter]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (formatFilter !== 'all') {
        params.format = formatFilter;
      }
      if (activeFilter !== 'all') {
        params.is_active = activeFilter;
      }

      const response = await templatesApi.admin.listSystemTemplates(params);
      setTemplates(response.templates);
    } catch (error) {
      toast({
        title: 'Failed to load templates',
        description: 'Could not fetch templates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to ${template.is_active ? 'deactivate' : 'activate'} this template?`)) {
      return;
    }

    try {
      await templatesApi.update(template.id, {
        is_active: !template.is_active,
      });
      toast({
        title: template.is_active ? 'Template deactivated' : 'Template activated',
        description: `Template "${template.name}" has been ${template.is_active ? 'deactivated' : 'activated'}.`,
      });
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Failed to update template',
        description: 'Could not update template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      await templatesApi.duplicate(template.id);
      toast({
        title: 'Template duplicated',
        description: `Template "${template.name}" has been duplicated.`,
      });
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Failed to duplicate template',
        description: 'Could not duplicate template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaved = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      template.content.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Templates</h1>
          <p className="text-slate-500">Manage system templates available to all users</p>
        </div>
        <Button onClick={handleCreate} className="bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, tags, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | 'all')}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
            <Select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as DraftFormat | 'all')}
            >
              {formats.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </Select>
            <Select
              value={activeFilter === 'all' ? 'all' : activeFilter ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setActiveFilter(value === 'all' ? 'all' : value === 'active');
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery || categoryFilter !== 'all' || formatFilter !== 'all' || activeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first template'}
          </p>
          {!searchQuery && categoryFilter === 'all' && formatFilter === 'all' && activeFilter === 'all' && (
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              currentUserId={user?.id}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <AdminTemplateEditor
        template={editingTemplate}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSaved={handleSaved}
      />
    </div>
  );
}
