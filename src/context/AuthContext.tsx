'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser { id: string; email: string; name: string | null; }

interface AuthContextValue {
    user: AuthUser | null;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    isLoading: true,
    refreshUser: async () => {},
    logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            setUser(data.user ?? null);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
    }, []);

    useEffect(() => { refreshUser(); }, [refreshUser]);

    return (
        <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
