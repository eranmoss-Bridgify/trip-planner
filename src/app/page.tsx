'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTrips } from '@/context/TripContext';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Calendar, Users, ArrowRight, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';

function WelcomeScreen() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { trips, isLoaded } = useTrips();

    const destination = searchParams.get('destination');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const passengers = Math.max(1, parseInt(searchParams.get('passengers') || '1'));
    const flight = searchParams.get('flight');
    const origin = searchParams.get('origin') || '';
    const destCode = searchParams.get('dest_code') || '';

    const hasParams = Boolean(destination && dateFrom);

    // No params at all → go to trips list
    useEffect(() => {
        if (isLoaded && !hasParams) {
            router.replace('/trips');
        }
    }, [isLoaded, hasParams]);

    // Find existing trip for these params
    const existingTrip = hasParams
        ? trips.find(t =>
            t.destination?.toLowerCase().includes((destination ?? '').toLowerCase()) &&
            t.startDate === dateFrom)
        : null;

    const wizardInitialData = {
        destination,
        destCode,
        dateFrom: dateFrom ? (() => { const [y,m,d] = dateFrom.split('-').map(Number); return new Date(y, m-1, d); })() : undefined,
        dateTo: dateTo ? (() => { const [y,m,d] = dateTo.split('-').map(Number); return new Date(y, m-1, d); })() : undefined,
        passengers,
        flight: flight || undefined,
        origin: origin || undefined,
    };

    if (!isLoaded || (!hasParams)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Format dates for display
    const fmtDate = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
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
                        {existingTrip ? `Continue your ${destination} trip` : `Plan your ${destination} trip`}
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
                            trigger={
                                <Button size="lg" className="gap-2 text-base px-8">
                                    <ArrowRight className="h-5 w-5" /> Start Planning
                                </Button>
                            }
                        />
                        {existingTrip && (
                            <Button
                                size="lg"
                                variant="outline"
                                className="gap-2 text-base bg-white/10 border-white/30 hover:bg-white/20 text-white hover:text-white"
                                onClick={() => router.push(`/trip/${existingTrip.id}`)}
                            >
                                <ArrowRight className="h-5 w-5" /> Continue Existing
                            </Button>
                        )}
                        <Button
                            size="lg"
                            variant="outline"
                            className="gap-2 text-base bg-white/10 border-white/30 hover:bg-white/20 text-white hover:text-white"
                            onClick={() => router.push('/trips')}
                        >
                            <Map className="h-5 w-5" /> My Trips
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
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
