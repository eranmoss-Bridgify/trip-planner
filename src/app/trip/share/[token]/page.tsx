'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Star, Clock, Calendar, Users, Lock, Pencil, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fmtPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTrips } from '@/context/TripContext';

interface SharedActivity {
    name: string;
    category: string;
    image_url: string;
    price: number;
    currency: string;
    duration: string;
    location: string;
    rating: number;
    day_date: string;
    is_best_seller: boolean;
}

interface SharedLeg {
    id: string;
    title: string;
    location: string;
    start_date: string;
    end_date: string;
    activities: SharedActivity[];
}

interface SharedTrip {
    name: string;
    destination: string;
    vibes: string[];
    owner_name: string;
    start_date: string;
    end_date: string;
    legs: SharedLeg[];
}

function fmt(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SharedTripPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const { addTrip } = useTrips();

    const [trip, setTrip] = useState<SharedTrip | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        fetch(`/api/trips/share/${token}`)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(data => setTrip(data.trip))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [token]);

    async function joinAndEdit() {
        if (!user) { setAuthOpen(true); return; }
        doJoin();
    }

    async function doJoin() {
        setJoining(true);
        try {
            const res = await fetch('/api/trips/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shareToken: token }),
            });
            if (!res.ok) return;
            const { trip: tripData } = await res.json();

            // Load the shared trip into TripContext so user can edit it immediately
            if (tripData) addTrip(tripData);

            setJoined(true);
            setTimeout(() => router.push('/trips'), 1200);
        } finally {
            setJoining(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Trip not found</h1>
                <p className="text-muted-foreground">This link may have expired or the trip is no longer shared.</p>
                <Button asChild><Link href="/">Plan your own trip</Link></Button>
            </div>
        );
    }

    if (!trip) return null;

    const totalActivities = trip.legs.reduce((s, l) => s + l.activities.length, 0);

    return (
        <>
            <AuthModal open={authOpen} onOpenChange={setAuthOpen} onAuthenticated={() => { setAuthOpen(false); doJoin(); }} />

            <div className="min-h-screen bg-background">
                {/* Hero header */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
                    <div className="max-w-3xl mx-auto px-4 py-10">
                        <p className="text-sm text-muted-foreground mb-1">{trip.owner_name} is sharing their trip</p>
                        <h1 className="text-3xl font-bold mb-3">{trip.name}</h1>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                            {trip.destination && (
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{trip.destination}</span>
                            )}
                            {trip.start_date && (
                                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{fmt(trip.start_date)}{trip.end_date ? ` — ${fmt(trip.end_date)}` : ''}</span>
                            )}
                            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{totalActivities} activities</span>
                        </div>
                        {trip.vibes?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {trip.vibes.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                            </div>
                        )}

                        {/* CTA */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {joined ? (
                                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                    <CheckCircle2 className="h-4 w-4" /> Added to your trips — redirecting…
                                </div>
                            ) : (
                                <Button onClick={joinAndEdit} disabled={joining} className="gap-2">
                                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                                    Edit this trip
                                </Button>
                            )}
                            <span className="text-xs text-muted-foreground">
                                {user ? 'You\'ll be added as a co-editor' : 'Sign in to collaborate'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Legs */}
                <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
                    {trip.legs.map((leg) => {
                        const byDay: Record<string, SharedActivity[]> = {};
                        for (const act of leg.activities) {
                            const d = act.day_date?.slice(0, 10) ?? 'unscheduled';
                            (byDay[d] ??= []).push(act);
                        }
                        const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));

                        return (
                            <section key={leg.id}>
                                <div className="flex items-center gap-2 mb-4">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <h2 className="text-lg font-semibold">{leg.title || leg.location}</h2>
                                    {leg.start_date && (
                                        <span className="text-sm text-muted-foreground">{fmt(leg.start_date)}{leg.end_date ? ` – ${fmt(leg.end_date)}` : ''}</span>
                                    )}
                                </div>

                                {days.length === 0 && (
                                    <p className="text-sm text-muted-foreground pl-6">No activities planned yet.</p>
                                )}

                                {days.map(([date, acts]) => (
                                    <div key={date} className="mb-6">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 pl-6">
                                            {date === 'unscheduled' ? 'Unscheduled' : new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {acts.map((act, i) => (
                                                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                                                    {act.image_url && (
                                                        <div className="relative h-36 bg-muted overflow-hidden">
                                                            <img
                                                                src={act.image_url}
                                                                alt={act.name}
                                                                className="w-full h-full object-cover"
                                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                            {act.is_best_seller && (
                                                                <Badge className="absolute top-2 left-2 text-[10px] bg-amber-500 border-0">Best Seller</Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="p-3">
                                                        <p className="font-medium text-sm leading-snug mb-1">{act.name}</p>
                                                        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                                            {act.rating > 0 && (
                                                                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{act.rating}</span>
                                                            )}
                                                            {act.duration && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{act.duration}</span>}
                                                            {act.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{act.location}</span>}
                                                        </div>
                                                        {act.price > 0 && (
                                                            <p className="text-sm font-semibold mt-2">{fmtPrice(act.price, act.currency)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        );
                    })}

                    <div className="border-t pt-8 text-center">
                        <p className="text-muted-foreground mb-3">Want to plan your own trip?</p>
                        <Button asChild variant="outline"><Link href="/">Start planning →</Link></Button>
                    </div>
                </div>
            </div>
        </>
    );
}
