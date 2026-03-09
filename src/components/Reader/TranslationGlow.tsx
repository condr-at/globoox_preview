'use client';

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
