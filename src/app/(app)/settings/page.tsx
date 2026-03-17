'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, HelpCircle, LogOut, Loader2, FlaskConical } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/lib/hooks/useAuth';
import JoinAlphaDialog from '@/components/JoinAlphaDialog';
import IOSSettingsRow from '@/components/ui/ios-settings-row';

const MODES = [
    { id: 'system', label: 'Browser Default' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
] as const;

const COLOR_THEMES = [
    { id: 'globoox', label: 'Globoox', lightTheme: 'forest-light', darkTheme: 'forest-dark' },
    { id: 'default', label: 'Default', lightTheme: 'light', darkTheme: 'dark' },
] as const;

export default function SettingsPage() {
    const router = useRouter();
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const { user, isAlpha, loading } = useAuth();
    const [signingOut, setSigningOut] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const { theme, setTheme, resolvedTheme } = useTheme();

    const PALETTE_KEY = 'globoox-palette';
    const [palette, setPalette] = useState<'globoox' | 'default'>(() => {
        if (typeof window === 'undefined') return 'default';
        return (localStorage.getItem(PALETTE_KEY) as 'globoox' | 'default') ?? 'default';
    });

    const currentColorTheme = palette;
    const currentMode = localStorage.getItem('globoox-mode') === 'system' ? 'system'
        : theme === 'dark' || theme === 'forest-dark' ? 'dark'
        : 'light';

    const applyAppearance = (mode: string, colorTheme: 'globoox' | 'default') => {
        localStorage.setItem(PALETTE_KEY, colorTheme);
        localStorage.setItem('globoox-mode', mode);
        setPalette(colorTheme);
        if (mode === 'system') {
            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(colorTheme === 'globoox'
                ? (dark ? 'forest-dark' : 'forest-light')
                : (dark ? 'dark' : 'light')
            );
            return;
        }
        setTheme(colorTheme === 'globoox'
            ? (mode === 'dark' ? 'forest-dark' : 'forest-light')
            : (mode === 'dark' ? 'dark' : 'light')
        );
    };

    useEffect(() => {
        const supabase = createClient();
        supabaseRef.current = supabase;
    }, []);

    const handleSignOut = async () => {
        if (!supabaseRef.current) return;
        setSigningOut(true);
        await supabaseRef.current.auth.signOut();
        router.push('/auth');
    };

    const displayName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'User';

    const displayEmail = user?.email || '';
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    return (
        <div className="min-h-screen bg-background pb-[calc(60px+env(safe-area-inset-bottom))]">
            <PageHeader title="Settings" />

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-4 space-y-4">
                {loading ? (
                    <Card className="shadow-none">
                        <CardContent className="flex items-center justify-center p-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </CardContent>
                    </Card>
                ) : user ? (
                    <>
                        {/* User Info */}
                        <Card className="shadow-none">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={displayName}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-8 h-8 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{displayName}</CardTitle>
                                            {isAlpha && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                    <FlaskConical className="w-3 h-3" />
                                                    Alpha
                                                </span>
                                            )}
                                        </div>
                                        <CardDescription>{displayEmail}</CardDescription>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Alpha Tester */}
                        {!isAlpha && (
                            <Card className="shadow-none">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <FlaskConical className="w-5 h-5 text-violet-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Join Alpha Program</p>
                                            <p className="text-xs text-muted-foreground">Get early access to new features</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20"
                                        onClick={() => setShowAccessModal(true)}
                                    >
                                        Join
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Appearance */}
                        <div>
                            <p className="px-4 pb-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                                Appearance
                            </p>
                            <Card className="shadow-none">
                                <CardContent className="p-0">
                                    <IOSSettingsRow
                                        label="Mode"
                                        value={currentMode}
                                        options={MODES}
                                        onChange={(id) => applyAppearance(id, currentColorTheme)}
                                    />
                                    <div className="ml-4 h-px bg-[var(--separator-opaque)]" />
                                    <IOSSettingsRow
                                        label="Theme"
                                        value={currentColorTheme}
                                        options={COLOR_THEMES}
                                        onChange={(id) => applyAppearance(currentMode, id as 'globoox' | 'default')}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Other */}
                        <div>
                            <p className="px-4 pb-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                                Other
                            </p>
                            <Card className="shadow-none">
                                <CardContent className="p-0">
                                    <Button variant="ghost" asChild className="w-full justify-start h-12 px-4 rounded-none">
                                        <a href="mailto:support@globoox.co">
                                            <HelpCircle className="w-5 h-5 mr-3" />
                                            Help & Support
                                        </a>
                                    </Button>
                                    <div className="pl-12 pr-4">
                                        <Separator />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start h-12 px-4 rounded-none text-destructive hover:text-destructive"
                                        onClick={handleSignOut}
                                        disabled={signingOut}
                                    >
                                        {signingOut ? (
                                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        ) : (
                                            <LogOut className="w-5 h-5 mr-3" />
                                        )}
                                        Sign Out
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : (
                    /* Guest state */
                    <Card className="shadow-none">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                    <User className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Guest User</CardTitle>
                                    <CardDescription>Sign in to sync your progress</CardDescription>
                                </div>
                            </div>
                            <Button asChild className="mt-4 w-full sm:w-auto">
                                <Link href="/auth">Sign In</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* App Info */}
                <p className="text-center text-xs text-muted-foreground">
                    Globoox v0.1
                </p>
            </div>

            {user && (
                <JoinAlphaDialog
                    open={showAccessModal}
                    onOpenChange={setShowAccessModal}
                    userEmail={user.email ?? ''}
                />
            )}
        </div>
    );
}
