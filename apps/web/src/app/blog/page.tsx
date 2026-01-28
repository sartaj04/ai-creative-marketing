import { Metadata } from 'next';
import { Navbar, Footer } from '@/components/layout/landing-layout';
import { PostCard } from '@/components/blog';
import { getAllPosts } from '@/lib/mdx';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/landing/scroll-reveal';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Blog',
  description:
    'Insights on personal branding, thought leadership, and building professional presence. Learn strategies for founders, executives, and consultants.',
  path: '/blog',
  keywords: [
    'personal branding blog',
    'linkedin tips',
    'thought leadership',
    'professional branding',
  ],
});

export default function BlogPage() {
  const posts = getAllPosts();
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/20 bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-36 pb-16 px-6 md:px-12 lg:px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest mb-4">
              Blog
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] mb-6">
              Insights on Personal Branding
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Strategies, frameworks, and practical advice for building a professional
              presence that opens doors.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">
                Blog posts coming soon. Check back later.
              </p>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featuredPost && (
                <ScrollReveal>
                  <div className="mb-12">
                    <PostCard post={featuredPost} featured />
                  </div>
                </ScrollReveal>
              )}

              {/* Other Posts Grid */}
              {otherPosts.length > 0 && (
                <StaggerContainer
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  staggerDelay={0.1}
                >
                  {otherPosts.map((post) => (
                    <StaggerItem key={post.slug}>
                      <PostCard post={post} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 px-6 md:px-12 lg:px-16 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
              Stay updated on personal branding
            </h2>
            <p className="text-slate-500 mb-8">
              Get weekly insights on building your professional presence delivered to
              your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
