'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const doneRef = useRef(false);

  async function initOneTap() {
    if (doneRef.current || !clientId || !window.google?.accounts?.id) return;
    doneRef.current = true; // set synchronously before any await to prevent double-calls

    // Don't show to already-authenticated users
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return;

    const rawNonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
    const hashedNonce = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      cancel_on_tap_outside: false,
      callback: async ({ credential }: { credential: string }) => {
        await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: credential,
          nonce: rawNonce,
        });
      },
    });

    window.google.accounts.id.prompt();
  }

  useEffect(() => {
    if (!clientId) return;

    // Script may already be loaded (SPA navigation, HMR)
    if (window.google?.accounts?.id) {
      initOneTap();
      return;
    }

    // Poll until the GSI script is ready (covers all timing scenarios)
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        initOneTap();
      }
    }, 100);

    const timeout = setTimeout(() => clearInterval(interval), 10_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!clientId) return null;

  return <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />;
}
