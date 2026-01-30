import { Metadata } from 'next';
import { siteConfig } from './config';

interface GenerateMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
}

export function generateMetadata({
  title,
  description,
  path = '',
  image,
  noIndex = false,
  keywords = [],
}: GenerateMetadataOptions = {}): Metadata {
  const metaTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name} - ${siteConfig.tagline}`;
  const metaDescription = description || siteConfig.description;
  const absoluteImage = image || siteConfig.ogImage;
  const metaImage = absoluteImage.startsWith('/')
    ? `${siteConfig.url}${absoluteImage}`
    : absoluteImage;
  const url = `${siteConfig.url}${path}`;
  const allKeywords = [...siteConfig.keywords, ...keywords];

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: allKeywords,
    authors: siteConfig.authors,
    creator: siteConfig.creator,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      title: metaTitle,
      description: metaDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: metaImage,
          width: 1024,
          height: 1024,
          alt: metaTitle,
        },
      ],
    },
    twitter: {
      card: siteConfig.twitter.cardType,
      title: metaTitle,
      description: metaDescription,
      site: siteConfig.twitter.site,
      creator: siteConfig.twitter.handle,
      images: [metaImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function generateArticleMetadata({
  title,
  description,
  path,
  image,
  publishedTime,
  modifiedTime,
  authors,
  tags,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedTime: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
}): Metadata {
  const baseMetadata = generateMetadata({
    title,
    description,
    path,
    image,
    keywords: tags,
  });

  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      type: 'article',
      publishedTime,
      modifiedTime,
      authors: authors || [siteConfig.name],
      tags,
    },
  };
}
