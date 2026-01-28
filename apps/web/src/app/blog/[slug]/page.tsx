import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { PostHeader, PostContent, RelatedPosts } from '@/components/blog';
import { getPostBySlug, getRelatedPosts, getAllPostSlugs } from '@/lib/mdx';
import { generateArticleMetadata } from '@/lib/seo/metadata';
import { generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo/structured-data';
import { siteConfig } from '@/lib/seo/config';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return generateArticleMetadata({
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    path: `/blog/${slug}`,
    image: post.frontmatter.image,
    publishedTime: post.frontmatter.date,
    authors: [post.frontmatter.author.name],
    tags: post.frontmatter.tags,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, post.frontmatter.tags);
  const postUrl = `${siteConfig.url}/blog/${slug}`;

  const articleSchema = generateArticleSchema({
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    url: postUrl,
    image: post.frontmatter.image,
    publishedTime: post.frontmatter.date,
    author: {
      name: post.frontmatter.author.name,
    },
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: siteConfig.url },
    { name: 'Blog', url: `${siteConfig.url}/blog` },
    { name: post.frontmatter.title, url: postUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
        <Navbar />

        <article className="pt-32 pb-20 px-6 md:px-12 lg:px-16">
          <div className="max-w-3xl mx-auto">
            <PostHeader
              frontmatter={post.frontmatter}
              readingTime={post.readingTime}
            />
            <PostContent content={post.content} />
            <RelatedPosts posts={relatedPosts} />
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}
