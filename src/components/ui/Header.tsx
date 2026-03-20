'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ShoppingBag, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IOSIcon from '@/components/ui/ios-icon';

export default function Header() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/my-books') {
            return pathname === '/' || pathname === '/my-books' || pathname.startsWith('/reader');
        }
        return pathname.startsWith(path);
    };

    // Hide tab bar on full-screen pages
    const isReaderPage = pathname.startsWith('/reader');
    const isAuthPage = pathname.startsWith('/auth');
    if (isReaderPage || isAuthPage) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t pb-[env(safe-area-inset-bottom)]">
            <div className="container max-w-2xl mx-auto flex items-center justify-around h-15">
                {/* Store — disabled, coming soon */}
                <Button
                    variant="ghost"
                    type="button"
                    aria-disabled="true"
                    className="flex-1 flex-col gap-1 h-full rounded-none cursor-not-allowed select-none px-3 hover:bg-transparent hover:text-inherit"
                >
                    <div className="relative">
                        <div className="opacity-40">
                            <IOSIcon icon={ShoppingBag} strokeWidth={1.5} />
                        </div>
                        <span className="absolute -top-0.5 -right-3 text-[8px] font-semibold text-white dark:text-black leading-none px-1 py-0.5 rounded-full bg-primary">
                            soon
                        </span>
                    </div>
                    <span className="text-[12px] font-medium opacity-40">Store</span>
                </Button>

                {/* My Books — center, main tab */}
                <Button
                    variant="ghost"
                    asChild
                    className={`flex-1 flex-col gap-1 h-full rounded-none ${
                        isActive('/my-books')
                            ? 'text-primary'
                            : 'text-muted-foreground'
                    }`}
                >
                    <Link href="/my-books">
                        <IOSIcon icon={BookOpen} strokeWidth={isActive('/my-books') ? 1.5 : 1.5} />
                        <span className="text-[12px] font-medium">My Books</span>
                    </Link>
                </Button>

                {/* Settings */}
                <Button
                    variant="ghost"
                    asChild
                    className={`flex-1 flex-col gap-1 h-full rounded-none ${
                        isActive('/settings')
                            ? 'text-primary'
                            : 'text-muted-foreground'
                    }`}
                >
                    <Link href="/settings">
                        <IOSIcon icon={Settings} strokeWidth={isActive('/settings') ? 1.5 : 1.5} />
                        <span className="text-[12px] font-medium">Settings</span>
                    </Link>
                </Button>
            </div>
        </nav>
    );
}
