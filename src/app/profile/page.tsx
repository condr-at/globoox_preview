'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, HelpCircle, LogOut, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

export default function ProfilePage() {
    const router = useRouter();
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabaseRef.current = supabase;

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
                <div className="container max-w-2xl mx-auto px-4 sm:px-6">
                    <h1 className="text-2xl font-bold py-4">Profile</h1>
                </div>
            </header>

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">
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
                                        <CardTitle className="text-lg">{displayName}</CardTitle>
                                        <CardDescription>{displayEmail}</CardDescription>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

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
        </div>
    );
}
