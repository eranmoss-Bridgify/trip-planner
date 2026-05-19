'use client';

import { useTrips } from '@/context/TripContext';
import { TripCard } from '@/components/demo/TripCard';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';
import { Button } from '@/components/ui/button';
import { Plus, Map } from 'lucide-react';

export default function TripsPage() {
    const { trips } = useTrips();

    return (
        <div className="container px-4 md:px-6 py-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Map className="h-6 w-6 text-primary" /> My Trips
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {trips.length} trip{trips.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <OnboardingWizard
                    trigger={
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> New Trip
                        </Button>
                    }
                />
            </div>

            {trips.length === 0 ? (
                <div className="rounded-xl border bg-muted/30 p-12 text-center space-y-4">
                    <p className="text-muted-foreground text-lg">No trips yet</p>
                    <OnboardingWizard
                        trigger={
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Create your first trip
                            </Button>
                        }
                    />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {trips.map(trip => (
                        <TripCard key={trip.id} trip={trip} />
                    ))}
                </div>
            )}
        </div>
    );
}
