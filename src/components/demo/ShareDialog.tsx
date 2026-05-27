'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Trip } from '@/lib/mock-data';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface ShareDialogProps {
    trip: Trip;
}

export function ShareDialog({ trip }: ShareDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function generateLink() {
        setLoading(true);
        setErrorMsg(null);
        try {
            // Auto-save the trip to DB first so share_token can be attached
            await fetch('/api/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trips: [trip] }),
            });

            const res = await fetch('/api/trips/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tripId: trip.id }),
            });
            const data = await res.json();
            if (res.ok) {
                setShareUrl(data.shareUrl);
            } else {
                setErrorMsg(data.error ?? 'Failed to generate link');
            }
        } finally {
            setLoading(false);
        }
    }

    function handleShareClick() {
        if (!user) {
            setAuthOpen(true);
            return;
        }
        setOpen(true);
        if (!shareUrl) generateLink();
    }

    function handleCopy() {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleAuthenticated() {
        setAuthOpen(false);
        setOpen(true);
        generateLink();
    }

    return (
        <>
            <AuthModal
                open={authOpen}
                onOpenChange={setAuthOpen}
                onAuthenticated={handleAuthenticated}
            />

            <Button variant="outline" size="sm" className="gap-2" onClick={handleShareClick}>
                <Share2 className="h-4 w-4" /> Share
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share Trip</DialogTitle>
                        <DialogDescription>
                            Anyone with this link can view "{trip.name}" — no login required.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center space-x-2 mt-2">
                        <div className="grid flex-1 gap-2">
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground h-9 px-3">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Generating link…
                                </div>
                            ) : (
                                <Input value={shareUrl ?? ''} readOnly placeholder="Generating…" />
                            )}
                        </div>
                        <Button size="sm" className="px-3" onClick={handleCopy} disabled={!shareUrl || loading}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>

                    {errorMsg && (
                        <p className="text-xs text-destructive mt-2">{errorMsg} — save your itinerary first.</p>
                    )}
                    {!errorMsg && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Anyone with this link can view your itinerary — no login required.
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
