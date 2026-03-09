'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, HelpCircle, LogOut, Loader2, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/lib/hooks/useAuth';
import UnlimitedAccessModal from '@/components/UnlimitedAccessModal';

export default function ProfilePage() {
    const router = useRouter();
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const { user, isAlpha, loading } = useAuth();
    const [signingOut, setSigningOut] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);

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
            {/* Header */}
            <PageHeader title="Profile" />

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-4 space-y-4">
                {loading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center p-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </CardContent>
                    </Card>
                ) : user ? (
                    <>
                        {/* User Info */}
                        <Card>
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
                            <Card>
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

                        {/* Menu Items */}
                        <Card>
                            <CardContent className="p-0">
                                <Button variant="ghost" className="w-full justify-start h-12 px-4 rounded-none">
                                    <Settings className="w-5 h-5 mr-3" />
                                    Settings
                                </Button>
                                <Separator />
                                <Button variant="ghost" className="w-full justify-start h-12 px-4 rounded-none">
                                    <HelpCircle className="w-5 h-5 mr-3" />
                                    Help & Support
                                </Button>
                                <Separator />
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
                    </>
                ) : (
                    /* Guest state */
                    <Card>
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
                    Globoox Preview v1.0.0
                </p>
            </div>

            {user && (
                <UnlimitedAccessModal
                    open={showAccessModal}
                    onOpenChange={setShowAccessModal}
                    userEmail={user.email ?? ''}
                    trigger="alpha_join"
                />
            )}
        </div>
    );
}
