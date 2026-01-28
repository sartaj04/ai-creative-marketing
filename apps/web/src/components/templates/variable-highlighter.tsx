'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VariableHighlighterProps {
  content: string;
  className?: string;
}

export function VariableHighlighter({ content, className }: VariableHighlighterProps) {
  const highlighted = useMemo(() => {
    // Match {variable_name} patterns
    const regex = /\{([^}]+)\}/g;
    const parts: { text: string; isVariable: boolean }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          text: content.slice(lastIndex, match.index),
          isVariable: false,
        });
      }
      // Add the variable
      parts.push({
        text: match[0],
        isVariable: true,
      });
      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        text: content.slice(lastIndex),
        isVariable: false,
      });
    }

    return parts;
  }, [content]);

  return (
    <div className={cn('whitespace-pre-wrap font-mono text-sm', className)}>
      {highlighted.map((part, index) => (
        <span
          key={index}
          className={cn(
            part.isVariable &&
              'rounded bg-primary/20 px-1 py-0.5 text-primary font-medium'
          )}
        >
          {part.text}
        </span>
      ))}
    </div>
  );
}

interface ExtractedVariablesProps {
  content: string;
  className?: string;
}

export function ExtractedVariables({ content, className }: ExtractedVariablesProps) {
  const variables = useMemo(() => {
    const regex = /\{([^}]+)\}/g;
    const vars: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1]);
      }
    }

    return vars;
  }, [content]);

  if (variables.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground italic', className)}>
        No variables detected
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {variables.map((variable) => (
        <span
          key={variable}
          className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
        >
          {variable}
        </span>
      ))}
    </div>
  );
}
