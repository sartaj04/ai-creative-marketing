'use client';

import { PostCard } from './post-card';
import type { BlogPostSummary } from '@/lib/mdx/types';

interface RelatedPostsProps {
  posts: BlogPostSummary[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-slate-200">
      <h2 className="text-2xl font-semibold text-slate-900 mb-8">
        Related Articles
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
