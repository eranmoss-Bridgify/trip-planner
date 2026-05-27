'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTrips } from '@/context/TripContext';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Calendar, Users, ArrowRight, Map, FolderOpen, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';
import { cn, fmtPrice } from '@/lib/utils';
import type { Trip } from '@/lib/mock-data';

// ── Trip picker sheet ────────────────────────────────────────────────────────

function TripPickerSheet({
    trips,
    open,
    onClose,
    onSelect,
    title,
}: {
    trips: Trip[];
    open: boolean;
    onClose: () => void;
    onSelect: (trip: Trip) => void;
    title: string;
}) {
    const fmtDate = (s?: string) => {
        if (!s) return '';
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const activityCount = (trip: Trip) =>
        trip.legs?.reduce((s, l) => s + (l.days?.reduce((ds, d) => ds + d.activities.length, 0) ?? 0), 0) ?? 0;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    {/* Sheet */}
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                            <h2 className="font-semibold text-base">{title}</h2>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Trip list */}
                        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
                            {trips.map(trip => {
                                const count = activityCount(trip);
                                return (
                                    <button
                                        key={trip.id}
                                        onClick={() => onSelect(trip)}
                                        className="w-full text-left rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all p-4 group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{trip.name}</p>
                                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                                                    {trip.destination && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />{trip.destination}
                                                        </span>
                                                    )}
                                                    {trip.startDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {fmtDate(trip.startDate)}{trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ''}
                                                        </span>
                                                    )}
                                                    <span>{count} activit{count === 1 ? 'y' : 'ies'}</span>
                                                </div>
                                                {(trip.vibes?.length ?? 0) > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {(trip.vibes ?? []).slice(0, 3).map(v => (
                                                            <span key={v} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{v}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Main welcome screen ──────────────────────────────────────────────────────

function WelcomeScreen() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { trips, isLoaded } = useTrips();
    const [pickerMode, setPickerMode] = useState<'matching' | 'all' | null>(null);

    const destination = searchParams.get('destination');
    const dateFrom = searchParams.get('date_from') ?? searchParams.get('startDate');
    const dateTo = searchParams.get('date_to') ?? searchParams.get('endDate');
    const adults = Math.max(1, parseInt(searchParams.get('adults') ?? searchParams.get('passengers') ?? '1'));
    const children = Math.max(0, parseInt(searchParams.get('children') ?? '0'));
    const passengers = adults;
    const flight = searchParams.get('flight');
    const origin = searchParams.get('origin') || '';
    const destCode = searchParams.get('dest_code') || '';
    const isEmbed = searchParams.get('embed') === '1';

    const hasParams = Boolean(destination && dateFrom);

    // No params → go to trips list
    useEffect(() => {
        if (isLoaded && !hasParams) {
            router.replace('/trips');
        }
    }, [isLoaded, hasParams]);

    // Trips that match this flight's destination + date
    const matchingTrips = hasParams
        ? trips.filter(t =>
            t.destination?.toLowerCase().includes((destination ?? '').toLowerCase()) &&
            t.startDate === dateFrom)
        : [];

    const hasExisting = matchingTrips.length > 0;
    const singleMatch = matchingTrips.length === 1 ? matchingTrips[0] : null;

    const wizardInitialData = {
        destination: destination ?? undefined,
        destCode,
        dateFrom: dateFrom ? (() => { const [y, m, d] = dateFrom.split('-').map(Number); return new Date(y, m - 1, d); })() : undefined,
        dateTo: dateTo ? (() => { const [y, m, d] = dateTo.split('-').map(Number); return new Date(y, m - 1, d); })() : undefined,
        adults,
        children,
        passengers,
        flight: flight || undefined,
        origin: origin || undefined,
    };

    const fmtDate = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleSelectTrip = (trip: Trip) => {
        setPickerMode(null);
        router.push(`/trip/${trip.id}`);
    };

    if (!isLoaded || !hasParams) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const pickerTrips = pickerMode === 'matching' ? matchingTrips : trips;
    const pickerTitle = pickerMode === 'matching'
        ? `${matchingTrips.length} trips to ${destination} — pick one`
        : 'Choose a trip to continue';

    return (
        <>
            <TripPickerSheet
                trips={pickerTrips}
                open={pickerMode !== null}
                onClose={() => setPickerMode(null)}
                onSelect={handleSelectTrip}
                title={pickerTitle}
            />

            <div className="min-h-[calc(100vh-0px)] flex flex-col">
                {/* Hero */}
                <div
                    className="relative flex-1 flex flex-col items-center justify-center text-white text-center px-6 py-20"
                    style={{
                        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 100%), url(https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=2070&auto=format&fit=crop)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-xl space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sm font-medium backdrop-blur-sm">
                            <MapPin className="h-4 w-4" /> {destination}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                            {hasExisting ? `Continue your ${destination} trip` : `Plan your ${destination} trip`}
                        </h1>

                        {/* Trip info pills */}
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            {dateFrom && (
                                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    <Calendar className="h-4 w-4" />
                                    {fmtDate(dateFrom)}{dateTo && dateTo !== dateFrom ? ` – ${fmtDate(dateTo)}` : ''}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                <Users className="h-4 w-4" />
                                {passengers} passenger{passengers !== 1 ? 's' : ''}
                            </div>
                            {flight && (
                                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    Flight {flight}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <OnboardingWizard
                                initialData={wizardInitialData}
                                defaultOpen={isEmbed}
                                trigger={
                                    <Button size="lg" className="gap-2 text-base px-8">
                                        <ArrowRight className="h-5 w-5" /> Start Planning
                                    </Button>
                                }
                            />

                            {/* Single exact match → go directly */}
                            {singleMatch && (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="gap-2 text-base bg-white/10 border-white/30 hover:bg-white/20 text-white hover:text-white"
                                    onClick={() => router.push(`/trip/${singleMatch.id}`)}
                                >
                                    <CheckCircle2 className="h-5 w-5" /> Continue "{singleMatch.name}"
                                </Button>
                            )}

                            {/* Multiple matches → show picker */}
                            {matchingTrips.length > 1 && (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="gap-2 text-base bg-white/10 border-white/30 hover:bg-white/20 text-white hover:text-white"
                                    onClick={() => setPickerMode('matching')}
                                >
                                    <FolderOpen className="h-5 w-5" /> Continue Trip ({matchingTrips.length})
                                </Button>
                            )}

                            {/* Always available: pick any existing trip */}
                            {trips.length > 0 && (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="gap-2 text-base bg-white/10 border-white/30 hover:bg-white/20 text-white hover:text-white"
                                    onClick={() => setPickerMode('all')}
                                >
                                    <Map className="h-5 w-5" />
                                    {hasExisting ? 'Other trips' : 'Add to existing trip'}
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
}

export default function HomePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <WelcomeScreen />
        </Suspense>
    );
}
