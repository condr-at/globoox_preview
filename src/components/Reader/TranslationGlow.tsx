'use client';

import { useAppStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

interface TranslationGlowProps {
    children: React.ReactNode;
}

export default function TranslationGlow({ children }: TranslationGlowProps) {
    return (
        <div className="relative h-full">
            {/* Content */}
            <div className="h-full">
                {children}
            </div>
        </div>
    );
}
