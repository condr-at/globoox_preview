import type { Metadata } from 'next';

export const siteTitle = 'Globoox';
export const sharedWidgetTitle = 'Globoox — Read Any Book in Your Language';

export const sharedWidgetDescription =
  'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian';

export function createProductPageTitle(pageName: string): string {
  return `${pageName} | ${siteTitle}`;
}

export function createSharedPreviewMetadata(url: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      title: sharedWidgetTitle,
      description: sharedWidgetDescription,
      type: 'website',
      url,
      siteName: 'Globoox',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: sharedWidgetTitle,
      description: sharedWidgetDescription,
    },
  };
}