'use client';

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BookActionsMenu from './BookActionsMenu';
import { useAuth } from '@/lib/hooks/useAuth';

// Resize base64 cover to card thumbnail size via Canvas.
// HTTPS URLs are returned as-is (handled by next/image optimizer).
function useCompressedCover(src: string, maxWidth = 480): string {
  const [compressed, setCompressed] = useState(src);
  const isDataUri = src.startsWith('data:');

  useEffect(() => {
    if (!isDataUri) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const webp = canvas.toDataURL('image/webp', 0.80);
      // Fall back to JPEG if WebP is not supported (very rare)
      setCompressed(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, maxWidth, isDataUri]);

  return isDataUri ? compressed : src;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function useThemeIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      setIsDark(root.classList.contains('dark') || root.classList.contains('forest-dark'));
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToCss(r: number, g: number, b: number): string {
  return `${clampChannel(r)} ${clampChannel(g)} ${clampChannel(b)}`;
}

function isProbablyNeutral(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 16;
}

function useCoverAccent(src: string): string {
  const [accent, setAccent] = useState<string>('120 120 128');

  useEffect(() => {
    let cancelled = false;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const sampleW = 32;
        const sampleH = 48;
        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

        let totalWeight = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;

        // Emphasize bottom-center area where Apple Books-like reflection is most visible.
        for (let y = 0; y < sampleH; y += 1) {
          for (let x = 0; x < sampleW; x += 1) {
            const idx = (y * sampleW + x) * 4;
            const a = data[idx + 3] / 255;
            if (a < 0.08) continue;

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luma < 12 || luma > 245) continue;

            const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
            const xCenterDist = Math.abs(x - sampleW / 2) / (sampleW / 2);
            const yBias = y / sampleH;
            const weight = a * (0.35 + sat * 0.9) * (1 - xCenterDist * 0.7) * (0.5 + yBias);

            totalWeight += weight;
            rSum += r * weight;
            gSum += g * weight;
            bSum += b * weight;
          }
        }

        if (totalWeight < 0.001) return;

        let r = rSum / totalWeight;
        let g = gSum / totalWeight;
        let b = bSum / totalWeight;

        // Slightly boost saturation so reflex reads, but avoid neon.
        const avg = (r + g + b) / 3;
        const satBoost = 1.12;
        r = avg + (r - avg) * satBoost;
        g = avg + (g - avg) * satBoost;
        b = avg + (b - avg) * satBoost;

        // For near-neutral covers use warm-neutral fallback to avoid muddy gray glow.
        if (isProbablyNeutral(r, g, b)) {
          setAccent('138 132 120');
          return;
        }

        setAccent(rgbToCss(r, g, b));
      } catch {
        // keep fallback accent
      }
    };
    img.onerror = () => {
      // keep fallback accent
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return accent;
}

function useImageAspect(src: string): { aspect: number | null; isReady: boolean } {
  const cacheKey = useMemo(() => `globoox:cover-aspect:${hashString(src)}`, [src]);
  const [aspect, setAspect] = useState<number | null>(() => {
    if (!src || typeof window === 'undefined') return null;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      const parsed = cached ? Number(cached) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  });
  const [isReady, setIsReady] = useState<boolean>(() => !src || aspect !== null);

  useEffect(() => {
    if (!src) {
      setAspect(null);
      setIsReady(true);
      return;
    }

    try {
      const cached = window.localStorage.getItem(cacheKey);
      const parsed = cached ? Number(cached) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        setAspect(parsed);
        setIsReady(true);
        return;
      }
    } catch {
      // noop
    }

    setIsReady(false);
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || img.naturalHeight === 0) return;
      const nextAspect = img.naturalWidth / img.naturalHeight;
      setAspect(nextAspect);
      setIsReady(true);
      try {
        window.localStorage.setItem(cacheKey, String(nextAspect));
      } catch {
        // noop
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      setIsReady(true);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, cacheKey]);

  return { aspect, isReady };
}

function getContainFrameStyle(imageAspect: number | null): CSSProperties {
  const containerAspect = 2 / 3;

  if (!imageAspect || imageAspect <= 0) {
    return { width: '66.667%', height: '100%' };
  }

  if (imageAspect > containerAspect) {
    return { width: '100%', height: `${(containerAspect / imageAspect) * 100}%` };
  }

  return { width: `${(imageAspect / containerAspect) * 100}%`, height: '100%' };
}

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover?: string | null;
  languages?: string[];
  progress?: number;
  isDemo?: boolean;
  onHide?: (id: string) => void;
  onDelete?: (id: string) => void;
  hideLabel?: string;
  onOpen?: () => void;
}

export default function BookCard({
  id,
  title,
  author,
  cover,
  progress = 0,
  onHide,
  onDelete,
  hideLabel,
  onOpen,
}: BookCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isCardFocused, setIsCardFocused] = useState(false);
  const { isAuthenticated } = useAuth();
  const hasActions = isAuthenticated && Boolean(onHide || onDelete);
  const sourceCover = (cover ?? '').trim();
  const displayCover = useCompressedCover(sourceCover);
  const [isImageFailed, setIsImageFailed] = useState(false);
  const hasValidCover = Boolean(displayCover) && !isImageFailed;
  const coverAccent = useCoverAccent(displayCover);
  const { aspect: coverAspect, isReady: isAspectReady } = useImageAspect(hasValidCover ? displayCover : '');
  const coverFrameStyle = getContainFrameStyle(coverAspect);
  const effectiveCoverFrameStyle = isAspectReady ? coverFrameStyle : { width: '100%', height: '100%' };
  const showMenuButton = !canHover || isCardHovered || isCardFocused || isMenuOpen;
  const isDarkTheme = useThemeIsDark();
  const fallbackColor = useMemo(() => {
    const hash = hashString(`${id}-${title}`);
    const hue = hash % 360;
    const saturation = 58;
    const lightness = isDarkTheme ? 69 : 62;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }, [id, title, isDarkTheme]);
  const fallbackShadow = useMemo(() => (
    `0 1px 2px color-mix(in srgb, ${fallbackColor} 32%, transparent), 0 12px 26px color-mix(in srgb, ${fallbackColor} 40%, transparent)`
  ), [fallbackColor]);
  const ambientShadowColor = hasValidCover
    ? (isDarkTheme ? 'rgba(196, 202, 212, 0.20)' : 'rgba(18, 24, 36, 0.16)')
    : `color-mix(in srgb, ${fallbackColor} 46%, transparent)`;

  useEffect(() => {
    setIsImageFailed(false);
  }, [displayCover]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setCanHover(mediaQuery.matches);

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, []);

  return (
    <div
      className="w-full relative"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      onFocusCapture={() => setIsCardFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsCardFocused(false);
        }
      }}
    >
      {hasActions && (
        <div
          className={`absolute z-20 pointer-events-none transition-opacity ${showMenuButton ? 'opacity-100' : 'opacity-0'}`}
          style={{ ...effectiveCoverFrameStyle, left: 0, top: 0 }}
        >
          <div className="absolute top-1 right-1 pointer-events-auto">
            <BookActionsMenu
              onHide={() => onHide?.(id)}
              onDelete={() => onDelete?.(id)}
              hideLabel={hideLabel}
              onOpenChange={setIsMenuOpen}
            />
          </div>
        </div>
      )}
      <Link
        href={`/reader/${id}`}
        className={`block transition-transform ${isMenuOpen ? 'pointer-events-none' : 'active:scale-[0.98]'}`}
        tabIndex={isMenuOpen ? -1 : 0}
        aria-disabled={isMenuOpen}
        onClick={(event) => {
          if (isMenuOpen) {
            event.preventDefault();
          } else {
            onOpen?.();
          }
        }}
      >
        <div className="relative mb-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[4%] right-[4%] bottom-[-14px] h-[34px] rounded-full blur-[8px]"
            style={{
              opacity: 'var(--book-reflex-opacity)',
              background: `radial-gradient(ellipse at center, rgba(${coverAccent} / 0.72) 0%, rgba(${coverAccent} / 0.52) 42%, rgba(${coverAccent} / 0.20) 70%, rgba(${coverAccent} / 0) 90%)`,
            }}
          />
          <div className="aspect-[2/3] relative">
            <div className="absolute left-0 bottom-0" style={effectiveCoverFrameStyle}>
              <div className="relative h-full w-full">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[3px]"
                  style={{ boxShadow: hasValidCover ? 'var(--book-card-shadow)' : fallbackShadow }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[7%] right-[7%] -bottom-[8px] h-[14px] -z-10 rounded-full blur-[8px]"
                  style={{ background: ambientShadowColor }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-[3px]">
                  {hasValidCover && isAspectReady ? (
                    <Image
                      src={displayCover}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 45vw, 180px"
                      onError={() => setIsImageFailed(true)}
                    />
                  ) : hasValidCover ? (
                    <Skeleton className="h-full w-full rounded-[3px] bg-muted animate-pulse" />
                  ) : (
                    <div aria-hidden="true" className="h-full w-full" style={{ backgroundColor: fallbackColor }} />
                  )}
                  {progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm font-medium mb-0.5 line-clamp-2 leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
      </Link>
    </div>
  );
}

interface StoreBookCardProps {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  reviews: number;
  price: string;
  hasDemo?: boolean;
  demoBookId?: string;
}

export function StoreBookCard({
  id,
  title,
  author,
  cover,
  rating,
  reviews,
  price,
  hasDemo,
}: StoreBookCardProps) {
  const sourceCover = (cover ?? '').trim();
  const [isImageFailed, setIsImageFailed] = useState(false);
  const hasValidCover = Boolean(sourceCover) && !isImageFailed;
  const { aspect: coverAspect, isReady: isAspectReady } = useImageAspect(hasValidCover ? sourceCover : '');
  const coverFrameStyle = getContainFrameStyle(coverAspect);
  const effectiveCoverFrameStyle = isAspectReady ? coverFrameStyle : { width: '100%', height: '100%' };
  const isDarkTheme = useThemeIsDark();
  const fallbackColor = useMemo(() => {
    const hash = hashString(`${id}-${title}`);
    const hue = hash % 360;
    const saturation = 58;
    const lightness = isDarkTheme ? 69 : 62;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }, [id, title, isDarkTheme]);
  const fallbackShadow = useMemo(() => (
    `0 1px 2px color-mix(in srgb, ${fallbackColor} 32%, transparent), 0 12px 26px color-mix(in srgb, ${fallbackColor} 40%, transparent)`
  ), [fallbackColor]);
  const ambientShadowColor = hasValidCover
    ? (isDarkTheme ? 'rgba(196, 202, 212, 0.20)' : 'rgba(18, 24, 36, 0.16)')
    : `color-mix(in srgb, ${fallbackColor} 46%, transparent)`;

  useEffect(() => {
    setIsImageFailed(false);
  }, [sourceCover]);

  return (
    <Link href={`/store/${id}`} className="block active:scale-[0.98] transition-transform">
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="aspect-[2/3] mb-2 relative">
            <div className="absolute left-0 bottom-0" style={effectiveCoverFrameStyle}>
              <div className="relative h-full w-full">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[3px]"
                  style={{ boxShadow: hasValidCover ? 'var(--book-card-shadow)' : fallbackShadow }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[7%] right-[7%] -bottom-[8px] h-[14px] -z-10 rounded-full blur-[8px]"
                  style={{ background: ambientShadowColor }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-[3px]">
                  {hasValidCover && isAspectReady ? (
                    <Image
                      src={sourceCover}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 45vw, 180px"
                      onError={() => setIsImageFailed(true)}
                    />
                  ) : hasValidCover ? (
                    <Skeleton className="h-full w-full rounded-[3px] bg-muted animate-pulse" />
                  ) : (
                    <div aria-hidden="true" className="h-full w-full" style={{ backgroundColor: fallbackColor }} />
                  )}
                  {hasDemo && (
                    <Badge className="absolute top-2 left-2">
                      Demo
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <CardTitle className="text-sm mb-1 line-clamp-2">{title}</CardTitle>
          <CardDescription className="text-xs mb-2 line-clamp-1">
            {author}
          </CardDescription>
          <div className="flex items-center space-x-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ({reviews >= 1000 ? `${(reviews / 1000).toFixed(1)}K` : reviews})
            </span>
          </div>
          <span className="text-sm font-bold">{price}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
