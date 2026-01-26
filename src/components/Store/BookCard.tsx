'use client';

import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BookCardProps {
    id: string;
    title: string;
    author: string;
    cover: string;
    languages?: string[];
    progress?: number;
    isDemo?: boolean;
}

export default function BookCard({
    id,
    title,
    author,
    cover,
    progress = 0,
}: BookCardProps) {
    return (
        <Link href={`/reader/${id}`} className="block active:scale-[0.98] transition-transform">
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
                        {/* Progress indicator */}
                        {progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-sm mb-1 line-clamp-2">{title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                        {author}
                    </CardDescription>
                </CardContent>
            </Card>
        </Link>
    );
}

// Store book card variant
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
