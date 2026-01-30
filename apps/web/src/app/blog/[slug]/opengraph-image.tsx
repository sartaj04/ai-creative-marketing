import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/mdx';
import { siteConfig } from '@/lib/seo/config';

export const runtime = 'nodejs';

export const alt = 'Pixo Blog Post';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
    const post = getPostBySlug(params.slug);
    const title = post?.frontmatter.title || siteConfig.name;
    const description = post?.frontmatter.description || siteConfig.tagline;

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #0f172a, #020617)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    padding: '80px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '40px'
                    }}
                >
                    <img
                        src="https://www.trypixo.com/android-chrome-192x192.png"
                        height="64"
                        width="64"
                        style={{ borderRadius: '12px', marginRight: '16px' }}
                    />
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>Pixo</div>
                </div>

                <div
                    style={{
                        fontSize: 70,
                        fontWeight: 'bold',
                        lineHeight: 1.1,
                        textAlign: 'center',
                        marginBottom: '20px',
                        backgroundClip: 'text',
                        backgroundImage: 'linear-gradient(to right, #22d3ee, #3b82f6)',
                        color: 'transparent',
                    }}
                >
                    {title}
                </div>

                <div
                    style={{
                        fontSize: 32,
                        color: '#94a3b8',
                        textAlign: 'center',
                        lineHeight: 1.4,
                        maxWidth: '900px',
                    }}
                >
                    {description}
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
