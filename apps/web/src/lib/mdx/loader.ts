import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { BlogPost, BlogPostSummary, BlogFrontmatter } from './types';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function getAllPosts(): BlogPostSummary[] {
  // Ensure the directory exists
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR);
  const posts = files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => {
      const filePath = path.join(BLOG_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const frontmatter = data as BlogFrontmatter;

      return {
        slug: file.replace('.mdx', ''),
        title: frontmatter.title,
        description: frontmatter.description,
        date: frontmatter.date,
        author: frontmatter.author,
        tags: frontmatter.tags || [],
        image: frontmatter.image,
        readingTime: calculateReadingTime(content),
        published: frontmatter.published,
      };
    })
    .filter((post) => post.published)
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  const frontmatter = data as BlogFrontmatter;

  if (!frontmatter.published) {
    return null;
  }

  return {
    slug,
    frontmatter,
    content,
    readingTime: calculateReadingTime(content),
  };
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR);
  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace('.mdx', ''));
}

export function getRelatedPosts(
  currentSlug: string,
  tags: string[],
  limit = 3
): BlogPostSummary[] {
  const allPosts = getAllPosts();

  return allPosts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => ({
      ...post,
      relevance: post.tags.filter((tag) => tags.includes(tag)).length,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

export function getPostsByTag(tag: string): BlogPostSummary[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) =>
    post.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getAllTags(): string[] {
  const allPosts = getAllPosts();
  const tagsSet = new Set<string>();

  allPosts.forEach((post) => {
    post.tags.forEach((tag) => tagsSet.add(tag));
  });

  return Array.from(tagsSet).sort();
}
