'use client';

import { useState, useEffect } from 'react';
import {
  Template,
  TemplateCategory,
  CreateTemplateRequest,
  templatesApi,
} from '@/lib/api/templates';
import { DraftFormat } from '@/lib/api/drafts';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { VariableHighlighter, ExtractedVariables } from './variable-highlighter';
import { Eye, Code } from 'lucide-react';

interface TemplateEditorProps {
  template?: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const categories: { value: TemplateCategory; label: string }[] = [
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

const formats: { value: DraftFormat; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'thread', label: 'Thread' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'article', label: 'Article' },
];

const platforms = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'both', label: 'Both' },
];

export function TemplateEditor({
  template,
  open,
  onOpenChange,
  onSaved,
}: TemplateEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('tips');
  const [format, setFormat] = useState<DraftFormat>('post');
  const [platform, setPlatform] = useState('linkedin');
  const [tagsInput, setTagsInput] = useState('');
  const [useCasesInput, setUseCasesInput] = useState('');
  const [toneFitInput, setToneFitInput] = useState('');

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setContent(template.content);
      setCategory(template.category);
      setFormat(template.format);
      setPlatform(template.platform);
      setTagsInput(template.tags.join(', '));
      setUseCasesInput(template.use_cases.join(', '));
      setToneFitInput(template.tone_fit.join(', '));
    } else {
      // Reset form for new template
      setName('');
      setDescription('');
      setContent('');
      setCategory('tips');
      setFormat('post');
      setPlatform('linkedin');
      setTagsInput('');
      setUseCasesInput('');
      setToneFitInput('');
    }
  }, [template, open]);

  const parseCommaSeparated = (input: string): string[] => {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and content are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const data: CreateTemplateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        category,
        format,
        platform,
        tags: parseCommaSeparated(tagsInput),
        use_cases: parseCommaSeparated(useCasesInput),
        tone_fit: parseCommaSeparated(toneFitInput),
      };

      if (isEditing && template) {
        await templatesApi.update(template.id, data);
        toast({
          title: 'Template updated',
          description: 'Your template has been saved.',
        });
      } else {
        await templatesApi.create(data);
        toast({
          title: 'Template created',
          description: 'Your template has been saved.',
        });
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'Create Template'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Myth Buster Template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of when to use this template"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Content *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <Code className="h-3 w-3 mr-1" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {showPreview ? (
            <div className="min-h-[200px] rounded-md border border-input bg-muted/30 p-3">
              <VariableHighlighter content={content} />
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your template content. Use {variable_name} for placeholders that will be filled by AI."
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Detected Variables</Label>
            <ExtractedVariables content={content} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as DraftFormat)}
            >
              {formats.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., leadership, productivity, career"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="useCases">Use Cases (comma-separated)</Label>
          <Input
            id="useCases"
            value={useCasesInput}
            onChange={(e) => setUseCasesInput(e.target.value)}
            placeholder="e.g., debunking misconceptions, educational content"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="toneFit">Tone Fit (comma-separated)</Label>
          <Input
            id="toneFit"
            value={toneFitInput}
            onChange={(e) => setToneFitInput(e.target.value)}
            placeholder="e.g., professional, authoritative, casual"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
