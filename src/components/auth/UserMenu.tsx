'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useState } from 'react';

export function UserMenu() {
    const { user, isLoading, logout } = useAuth();
    const [authOpen, setAuthOpen] = useState(false);

    if (isLoading) return null;

    if (!user) {
        return (
            <>
                <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} className="gap-2 text-sm">
                    <User className="h-4 w-4" /> Sign In
                </Button>
                <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
            </>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                        {(user.name ?? user.email)[0].toUpperCase()}
                    </div>
                    <span className="max-w-[120px] truncate">{user.name ?? user.email}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2">
                    <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
