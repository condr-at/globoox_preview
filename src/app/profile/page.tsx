'use client';

import { User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
                <div className="container max-w-2xl mx-auto px-4 sm:px-6">
                    <h1 className="text-2xl font-bold py-4">Profile</h1>
                </div>
            </header>

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">
                {/* User Info */}
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
                        <Button variant="ghost" className="w-full justify-start h-12 px-4 rounded-none text-destructive hover:text-destructive">
                            <LogOut className="w-5 h-5 mr-3" />
                            Sign Out
                        </Button>
                    </CardContent>
                </Card>

                {/* App Info */}
                <p className="text-center text-xs text-muted-foreground">
                    Globoox Preview v1.0.0
                </p>
            </div>
        </div>
    );
}
