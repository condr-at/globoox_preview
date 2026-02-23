'use client';

import { useState } from 'react';
import { X, BookMarked, Smartphone, Globe } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/supabase/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  { icon: BookMarked, text: 'Your books saved and accessible anywhere' },
  { icon: Smartphone, text: 'Progress synced across all your devices' },
  { icon: Globe, text: 'AI translation to EN · FR · ES · RU' },
];

export default function SignInToUploadModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const siteUrl = getSiteUrl();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/library?upload=1')}`,
      },
    });
    // If we get here the redirect didn't happen (error), reset loading
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {/* drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-6 pt-4 pb-0 sm:pt-6">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* icon */}
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookMarked className="w-5 h-5 text-primary" />
          </div>

          <h2 className="text-xl font-semibold leading-tight mb-1">
            Upload your first book
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            A free account keeps your library safe and lets you read any EPUB in four languages — takes 5 seconds.
          </p>

          {/* Benefits */}
          <ul className="space-y-3 mb-6">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {!loading && <GoogleIcon className="size-4 shrink-0" />}
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Soft escape */}
          <button
            onClick={onClose}
            className="w-full mt-3 mb-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
