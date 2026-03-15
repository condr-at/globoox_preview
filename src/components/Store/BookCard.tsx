'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import BookActionsMenu from './BookActionsMenu';
import { useAuth } from '@/lib/hooks/useAuth';

// Resize base64 cover to card thumbnail size via Canvas.
// HTTPS URLs are returned as-is (handled by next/image optimizer).
function useCompressedCover(src: string, maxWidth = 480): string {
  const [compressed, setCompressed] = useState(src);

  useEffect(() => {
    if (!src.startsWith('data:')) {
      setCompressed(src);
      return;
    }
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
  }, [src, maxWidth]);

  return compressed;
}

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover: string;
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
  const { isAuthenticated } = useAuth();
  const hasActions = isAuthenticated && Boolean(onHide || onDelete);
  const displayCover = useCompressedCover(cover);

  return (
    <div className="w-full relative">
      {hasActions && (
        <div className="absolute top-1 right-1 z-10">
          <BookActionsMenu
            onHide={() => onHide?.(id)}
            onDelete={() => onDelete?.(id)}
            hideLabel={hideLabel}
            onOpenChange={setIsMenuOpen}
          />
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
        <div className="aspect-[2/3] rounded-md bg-muted mb-2 overflow-hidden relative shadow-md">
          <Image
            src={displayCover}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 45vw, 180px"
          />
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
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
  return (
    <Link href={`/store/${id}`} className="block active:scale-[0.98] transition-transform">
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="aspect-[2/3] rounded-md bg-muted mb-2 overflow-hidden relative">
            <Image
              src={cover}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 45vw, 180px"
            />
            {hasDemo && (
              <Badge className="absolute top-2 left-2">
                Demo
              </Badge>
            )}
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
