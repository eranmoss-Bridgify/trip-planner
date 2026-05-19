'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Mail, Lock, User, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAuthenticated?: () => void;
}

type Step = 'credentials' | 'otp';
type Mode = 'login' | 'register';

export function AuthModal({ open, onOpenChange, onAuthenticated }: AuthModalProps) {
    const { refreshUser } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [step, setStep] = useState<Step>('credentials');
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const reset = () => {
        setStep('credentials');
        setError('');
        setOtp('');
        setEmail('');
        setPassword('');
        setName('');
        setUserId('');
    };

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
            const body = mode === 'register' ? { email, password, name } : { email, password };
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
            setUserId(data.userId);
            setStep('otp');
        } catch {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    };

    const handleOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, otp }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Invalid code'); return; }
            await refreshUser();
            onOpenChange(false);
            reset();
            onAuthenticated?.();
        } catch {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {step === 'otp' ? 'Enter verification code' : mode === 'register' ? 'Create your account' : 'Sign in to WanderVault'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'otp'
                            ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
                            : mode === 'register'
                            ? 'Save your trips and access them anywhere.'
                            : 'Sign in to save and sync your itineraries.'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'credentials' ? (
                    <form onSubmit={handleCredentials} className="space-y-4 mt-2">
                        {mode === 'register' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" required />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-9" required minLength={8} />
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {mode === 'register' ? 'Create Account' : 'Sign In'}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button type="button" className="text-primary underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                                {mode === 'register' ? 'Sign in' : 'Register'}
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleOtp} className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="otp">Verification code</Label>
                            <Input
                                id="otp"
                                placeholder="123456"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-[0.5em] font-mono"
                                maxLength={6}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Verify & Continue
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            Didn't receive it?{' '}
                            <button type="button" className="text-primary underline" onClick={() => setStep('credentials')}>
                                Go back
                            </button>
                        </p>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
