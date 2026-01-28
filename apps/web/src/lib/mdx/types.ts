export interface BlogAuthor {
  name: string;
  role: string;
  image?: string;
}

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  author: BlogAuthor;
  tags: string[];
  image?: string;
  published: boolean;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  content: string;
  readingTime: number;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: BlogAuthor;
  tags: string[];
  image?: string;
  readingTime: number;
}
