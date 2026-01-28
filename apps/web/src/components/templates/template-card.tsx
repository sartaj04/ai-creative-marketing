'use client';

import { Template, TemplateCategory, ContributionStatus } from '@/lib/api/templates';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, truncate } from '@/lib/utils';
import {
  Copy,
  Edit3,
  MoreVertical,
  Trash2,
  BarChart3,
  Shield,
  User,
  Users,
  Share2,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface TemplateCardProps {
  template: Template;
  currentUserId?: string;
  onEdit: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (template: Template) => void;
  onContribute?: (template: Template) => void;
  onWithdrawContribution?: (template: Template) => void;
}

const categoryLabels: Record<TemplateCategory, string> = {
  myth_buster: 'Myth Buster',
  tips: 'Tips',
  story: 'Story',
  framework: 'Framework',
  contrarian: 'Contrarian',
  lessons: 'Lessons',
  listicle: 'Listicle',
  question: 'Question',
  comparison: 'Comparison',
  announcement: 'Announcement',
  case_study: 'Case Study',
};

const categoryColors: Record<TemplateCategory, string> = {
  myth_buster: 'bg-red-100 text-red-700',
  tips: 'bg-green-100 text-green-700',
  story: 'bg-purple-100 text-purple-700',
  framework: 'bg-blue-100 text-blue-700',
  contrarian: 'bg-orange-100 text-orange-700',
  lessons: 'bg-teal-100 text-teal-700',
  listicle: 'bg-indigo-100 text-indigo-700',
  question: 'bg-pink-100 text-pink-700',
  comparison: 'bg-cyan-100 text-cyan-700',
  announcement: 'bg-lime-100 text-lime-700',
  case_study: 'bg-slate-100 text-slate-700',
};

// Helper to get ownership badge info
function getOwnershipBadge(template: Template, currentUserId?: string) {
  if (template.is_system) {
    return {
      icon: Shield,
      label: 'System',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    };
  }
  if (template.contribution_status === 'approved' && template.created_by !== currentUserId) {
    return {
      icon: Users,
      label: 'Community',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    };
  }
  return {
    icon: User,
    label: 'My Template',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
}

// Helper to get contribution status badge
function getContributionBadge(status: ContributionStatus) {
  switch (status) {
    case 'pending':
      return {
        icon: Clock,
        label: 'Pending Review',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
      };
    case 'approved':
      return {
        icon: Check,
        label: 'Shared',
        className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
      };
    case 'rejected':
      return {
        icon: X,
        label: 'Not Approved',
        className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
      };
    default:
      return null;
  }
}

export function TemplateCard({
  template,
  currentUserId,
  onEdit,
  onDuplicate,
  onDelete,
  onContribute,
  onWithdrawContribution,
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const variableCount = Object.keys(template.variables || {}).length;
  const ownershipBadge = getOwnershipBadge(template, currentUserId);
  const contributionBadge = !template.is_system && template.contribution_status !== 'none'
    ? getContributionBadge(template.contribution_status)
    : null;

  const isOwner = template.created_by === currentUserId;
  const canEdit = isOwner && !template.is_system;
  const canDelete = isOwner && !template.is_system;
  const canContribute = isOwner && !template.is_system && template.contribution_status === 'none';
  const canWithdraw = isOwner && template.contribution_status === 'pending';

  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Ownership Badge */}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1',
                ownershipBadge.className
              )}
            >
              <ownershipBadge.icon className="h-3 w-3" />
              {ownershipBadge.label}
            </span>

            {/* Category Badge */}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                categoryColors[template.category]
              )}
            >
              {categoryLabels[template.category]}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
              {template.format}
            </span>

            {/* Contribution Status Badge */}
            {contributionBadge && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1',
                  contributionBadge.className
                )}
              >
                <contributionBadge.icon className="h-3 w-3" />
                {contributionBadge.label}
              </span>
            )}

            {!template.is_active && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                Inactive
              </span>
            )}
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
                  {canEdit && (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(template);
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  <button
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(template);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>
                  {canContribute && onContribute && (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-purple-600 hover:bg-muted"
                      onClick={() => {
                        setShowMenu(false);
                        onContribute(template);
                      }}
                    >
                      <Share2 className="h-3 w-3" />
                      Share with Platform
                    </button>
                  )}
                  {canWithdraw && onWithdrawContribution && (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-yellow-600 hover:bg-muted"
                      onClick={() => {
                        setShowMenu(false);
                        onWithdrawContribution(template);
                      }}
                    >
                      <X className="h-3 w-3" />
                      Withdraw Contribution
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(template);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold leading-tight">{template.name}</h4>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {truncate(template.description, 80)}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs font-mono text-muted-foreground line-clamp-3">
            {truncate(template.content, 150)}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{variableCount} variables</span>
            {template.usage_count > 0 && (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {template.usage_count} uses
              </span>
            )}
          </div>
          {template.approval_rate > 0 && (
            <span className="text-green-600">
              {Math.round(template.approval_rate * 100)}% approval
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
