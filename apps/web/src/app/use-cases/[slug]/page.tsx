import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { useCases, getUseCaseBySlug, getAllUseCaseSlugs } from '@/data/use-cases';
import { UseCaseTemplate } from '@/components/use-cases/use-case-template';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo/metadata';
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
} from '@/lib/seo/structured-data';
import { siteConfig } from '@/lib/seo/config';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllUseCaseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCaseBySlug(slug);

  if (!useCase) {
    return {};
  }

  return generateSEOMetadata({
    title: useCase.metaTitle,
    description: useCase.metaDescription,
    path: `/use-cases/${useCase.slug}`,
    keywords: [
      `${useCase.slug} personal branding`,
      `${useCase.slug} linkedin`,
      'personal brand',
      'thought leadership',
    ],
  });
}

export default async function UseCasePage({ params }: Props) {
  const { slug } = await params;
  const useCase = getUseCaseBySlug(slug);

  if (!useCase) {
    notFound();
  }

  const pageUrl = `${siteConfig.url}/use-cases/${useCase.slug}`;

  const webPageSchema = generateWebPageSchema({
    title: useCase.metaTitle,
    description: useCase.metaDescription,
    url: pageUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: siteConfig.url },
    { name: 'Use Cases', url: `${siteConfig.url}/use-cases` },
    { name: useCase.title, url: pageUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <UseCaseTemplate useCase={useCase} />
    </>
  );
}
