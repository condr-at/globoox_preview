import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Header from '@/components/ui/Header';
import PostHogProvider from '@/components/PostHogProvider';
import SyncCheckClient from '@/components/SyncCheckClient';
import PaletteSync from '@/components/PaletteSync';

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
  title: 'Globoox',
  description: 'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
  keywords: [
    'reading',
    'books',
    'translation',
    'language learning',
    'ebooks',
    'epub reader',
    'AI translation',
    'book translator',
  ],
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Globoox',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Globoox — AI-Powered Ebook Translation',
    description:
      'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
    type: 'website',
    url: 'https://globoox.com',
    siteName: 'Globoox',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Globoox — AI-Powered Ebook Translation',
    description:
      'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var mode = 'dark';
              var palette = 'globoox';
              var raw = localStorage.getItem('globoox-app-theme');
              if (raw) {
                try {
                  var parsed = JSON.parse(raw);
                  if (parsed && parsed.state) {
                    if (parsed.state.mode === 'light' || parsed.state.mode === 'dark' || parsed.state.mode === 'system') {
                      mode = parsed.state.mode;
                    }
                    if (parsed.state.palette === 'globoox' || parsed.state.palette === 'default') {
                      palette = parsed.state.palette;
                    }
                  }
                } catch (_e) {}
              } else {
                var legacyMode = localStorage.getItem('globoox-mode');
                var legacyPalette = localStorage.getItem('globoox-palette');
                if (legacyMode === 'light' || legacyMode === 'dark' || legacyMode === 'system') mode = legacyMode;
                if (legacyPalette === 'globoox' || legacyPalette === 'default') palette = legacyPalette;
              }
              var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              var cls = palette === 'globoox' ? (dark ? 'forest-dark' : 'forest-light') : (dark ? 'dark' : 'light');
              document.documentElement.classList.remove('light', 'dark', 'forest-light', 'forest-dark');
              document.documentElement.classList.add(cls);
            } catch(e) {}
          })();
        ` }} />
      {process.env.NODE_ENV === 'production' && (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "vo25c0m78q");
            `,
          }}
        />
      )}
      <div className="antialiased bg-[var(--bg-grouped)]">
        <PostHogProvider />
        <SyncCheckClient />
        <PaletteSync />
        <div className="min-h-screen">
          <main>
            {children}
          </main>
          </div>
        <Header />
      </div>
    </>
  );
}
