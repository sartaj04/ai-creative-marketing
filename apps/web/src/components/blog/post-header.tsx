'use client';

import Link from 'next/link';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import type { BlogFrontmatter } from '@/lib/mdx/types';

interface PostHeaderProps {
  frontmatter: BlogFrontmatter;
  readingTime: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PostHeader({ frontmatter, readingTime }: PostHeaderProps) {
  return (
    <header className="mb-12">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-600 transition-colors mb-8 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Blog
      </Link>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {frontmatter.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-cyan-50 text-cyan-700 text-sm font-medium rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-[-0.02em] leading-tight mb-6">
        {frontmatter.title}
      </h1>

      {/* Description */}
      <p className="text-xl text-slate-500 leading-relaxed mb-8">
        {frontmatter.description}
      </p>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-6 pb-8 border-b border-slate-200">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {frontmatter.author.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <p className="font-medium text-slate-900">{frontmatter.author.name}</p>
            <p className="text-sm text-slate-500">{frontmatter.author.role}</p>
          </div>
        </div>

        {/* Date and reading time */}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(frontmatter.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {readingTime} min read
          </span>
        </div>
      </div>
    </header>
  );
}
