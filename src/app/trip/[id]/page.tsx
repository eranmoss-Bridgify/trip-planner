'use client';

import { notFound } from 'next/navigation';
import { TripDetailsView } from '@/components/demo/TripDetailsView';
import { useTrips } from '@/context/TripContext';
import { useParams } from 'next/navigation';

export default function TripPage() {
    const { id } = useParams() as { id: string };
    const { trips, isLoaded } = useTrips();
    const trip = trips.find(t => t.id === id);

    if (!isLoaded) return null; // or a loading spinner

    if (!trip && isLoaded) {
        notFound();
    }

    // Pass the actual trip id so the view can pick it up via Context as the Active Trip for its rendering
    return <TripDetailsView tripId={id} />;
}
