import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/ui/Header';
import { ThemeProvider } from '@/components/theme-provider';
import PostHogProvider from '@/components/PostHogProvider';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Globoox Preview',
  description: 'Reading app that translates any book with AI',
  keywords: ['reading', 'books', 'translation', 'language learning', 'ebooks'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Globoox',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Globoox Preview',
    description: 'Reading app that translates any book with AI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg-grouped)]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider />
          <div className="min-h-screen">
            <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
              {children}
            </main>
          </div>
          <Header />
        </ThemeProvider>
      </body>
    </html>
  );
}
