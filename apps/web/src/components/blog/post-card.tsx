'use client';

import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { BlogPostSummary } from '@/lib/mdx/types';

interface PostCardProps {
  post: BlogPostSummary;
  featured?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PostCard({ post, featured = false }: PostCardProps) {
  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} className="group block">
        <Card className="p-8 md:p-10 border-slate-200 bg-gradient-to-br from-cyan-50/50 to-white rounded-2xl hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 group-hover:text-cyan-600 transition-colors">
              {post.title}
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">
              {post.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readingTime} min read
                </span>
              </div>
              <span className="text-cyan-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Read more
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <Card className="p-6 border-slate-200 bg-white rounded-2xl hover:border-slate-300 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
          {post.description}
        </p>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(post.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {post.readingTime} min
          </span>
        </div>
      </Card>
    </Link>
  );
}
