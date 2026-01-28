'use client';

import { useState, useEffect } from 'react';
import {
  Template,
  TemplateCategory,
  templatesApi,
  AnalyzeTemplateResponse,
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
import {
  Eye,
  Code,
  Wand2,
  Loader2,
  Sparkles,
  CheckCircle,
  Shield,
} from 'lucide-react';

interface AdminTemplateEditorProps {
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

export function AdminTemplateEditor({
  template,
  open,
  onOpenChange,
  onSaved,
}: AdminTemplateEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Form fields
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('tips');
  const [format, setFormat] = useState<DraftFormat>('post');
  const [platform, setPlatform] = useState('linkedin');
  const [tagsInput, setTagsInput] = useState('');
  const [useCasesInput, setUseCasesInput] = useState('');
  const [toneFitInput, setToneFitInput] = useState('');

  // Analysis suggestions
  const [suggestions, setSuggestions] = useState<AnalyzeTemplateResponse | null>(
    null
  );

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setContent(template.content);
      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category);
      setFormat(template.format);
      setPlatform(template.platform);
      setTagsInput(template.tags.join(', '));
      setUseCasesInput(template.use_cases.join(', '));
      setToneFitInput(template.tone_fit.join(', '));
      setHasAnalyzed(true);
    } else {
      // Reset form for new template
      setContent('');
      setName('');
      setDescription('');
      setCategory('tips');
      setFormat('post');
      setPlatform('linkedin');
      setTagsInput('');
      setUseCasesInput('');
      setToneFitInput('');
      setHasAnalyzed(false);
      setSuggestions(null);
    }
  }, [template, open]);

  const parseCommaSeparated = (input: string): string[] => {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please paste template content to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await templatesApi.admin.analyze({
        content: content.trim(),
        name: name || undefined,
        description: description || undefined,
      });

      setSuggestions(analysis);

      // Auto-fill empty fields with suggestions
      if (!name && analysis.suggested_name) {
        setName(analysis.suggested_name);
      }
      if (!description && analysis.suggested_description) {
        setDescription(analysis.suggested_description);
      }
      if (!tagsInput && analysis.tags.length > 0) {
        setTagsInput(analysis.tags.join(', '));
      }
      if (!useCasesInput && analysis.use_cases.length > 0) {
        setUseCasesInput(analysis.use_cases.join(', '));
      }
      if (!toneFitInput && analysis.tone_fit.length > 0) {
        setToneFitInput(analysis.tone_fit.join(', '));
      }

      setCategory(analysis.category);
      setFormat(analysis.format);
      setPlatform(analysis.platform);
      setHasAnalyzed(true);

      toast({
        title: 'Analysis complete',
        description: 'Template metadata has been extracted. Review and adjust as needed.',
      });
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: 'Could not analyze template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please enter template content.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && template) {
        // Update existing template
        await templatesApi.update(template.id, {
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          content: content.trim(),
          category,
          format,
          platform,
          tags: parseCommaSeparated(tagsInput),
          use_cases: parseCommaSeparated(useCasesInput),
          tone_fit: parseCommaSeparated(toneFitInput),
        });
        toast({
          title: 'Template updated',
          description: 'System template has been saved.',
        });
      } else {
        // Create new system template
        await templatesApi.admin.createSystemTemplate({
          content: content.trim(),
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          category,
          format,
          platform,
          tags: parseCommaSeparated(tagsInput),
          use_cases: parseCommaSeparated(useCasesInput),
          tone_fit: parseCommaSeparated(toneFitInput),
        });
        toast({
          title: 'System template created',
          description: 'Template is now available to all users.',
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
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          {isEditing ? 'Edit System Template' : 'Create System Template'}
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Step 1: Paste Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content" className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                1
              </span>
              Paste Template Content
            </Label>
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
              onChange={(e) => {
                setContent(e.target.value);
                setHasAnalyzed(false);
              }}
              placeholder="Paste your template content here. Use {variable_name} for placeholders that will be filled by AI.

Example:
Most people think {myth}.

But here's the truth: {reality}.

Here's why this matters:
• {point_1}
• {point_2}
• {point_3}

{call_to_action}"
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          )}

          {content.trim() && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Detected Variables
              </Label>
              <ExtractedVariables content={content} />
            </div>
          )}
        </div>

        {/* Step 2: Analyze */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </span>
            Auto-Extract Metadata
          </Label>
          <Button
            type="button"
            variant="outline"
            onClick={handleAnalyze}
            disabled={!content.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : hasAnalyzed ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                Re-analyze Content
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Analyze & Extract Metadata
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Uses AI to automatically extract category, tags, use cases, and tone
            from the template content.
          </p>
        </div>

        {/* Step 3: Review & Edit Metadata */}
        {hasAnalyzed && (
          <>
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </span>
                Review & Edit Metadata
              </Label>

              {suggestions && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                    <Sparkles className="h-4 w-4" />
                    AI Suggestions Applied
                  </div>
                  <p className="text-blue-600 dark:text-blue-400 text-xs">
                    Review the extracted metadata below. You can edit any field to
                    override the AI suggestions.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
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
          </>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || !content.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            'Update System Template'
          ) : (
            'Create System Template'
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
