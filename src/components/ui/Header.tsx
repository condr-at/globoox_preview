'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ShoppingBag, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/library') {
            return pathname === '/' || pathname === '/library' || pathname.startsWith('/reader');
        }
        return pathname.startsWith(path);
    };

    // Hide tab bar on full-screen pages
    const isReaderPage = pathname.startsWith('/reader');
    const isAuthPage = pathname.startsWith('/auth');
    if (isReaderPage || isAuthPage) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t pb-[env(safe-area-inset-bottom)]">
            <div className="container max-w-2xl mx-auto flex items-center justify-around h-14">
                {/* Store — disabled, coming soon */}
                <Button
                    variant="ghost"
                    disabled
                    className="flex-1 flex-col gap-0.5 h-full rounded-none opacity-40 cursor-not-allowed select-none px-3"
                >
                    <div className="relative">
                        <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
                        <span className="absolute -top-0.5 -right-3 text-[8px] font-semibold text-white leading-none px-1 py-0.5 rounded-full bg-primary opacity-100">
                            soon
                        </span>
                    </div>
                    <span className="text-[10px] font-medium">Store</span>
                </Button>

                {/* Library — center, main tab */}
                <Button
                    variant="ghost"
                    asChild
                    className={`flex-1 flex-col gap-0.5 h-full rounded-none ${
                        isActive('/library')
                            ? 'text-primary'
                            : 'text-muted-foreground'
                    }`}
                >
                    <Link href="/library">
                        <BookOpen className="w-6 h-6" strokeWidth={isActive('/library') ? 2 : 1.5} />
                        <span className="text-[10px] font-medium">Library</span>
                    </Link>
                </Button>

                {/* Profile */}
                <Button
                    variant="ghost"
                    asChild
                    className={`flex-1 flex-col gap-0.5 h-full rounded-none ${
                        isActive('/profile')
                            ? 'text-primary'
                            : 'text-muted-foreground'
                    }`}
                >
                    <Link href="/profile">
                        <User className="w-6 h-6" strokeWidth={isActive('/profile') ? 2 : 1.5} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </Button>
            </div>
        </nav>
    );
}
