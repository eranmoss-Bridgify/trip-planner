'use client';

import { Trip } from '@/lib/mock-data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTrips } from '@/context/TripContext';
import { useRouter } from 'next/navigation';

interface TripCardProps {
    trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
    const { removeTrip } = useTrips();
    const router = useRouter();

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;
        removeTrip(trip.id);
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow border-muted group cursor-pointer">
            <div className="h-40 bg-muted/50 relative overflow-hidden">
                <img
                    src={trip.image}
                    alt={trip.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-bold text-lg">{trip.name}</h3>
                </div>
                <button
                    onClick={handleDelete}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600/80 transition-all"
                    title="Delete trip"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            <CardContent className="pt-4 grid gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{(() => { const [y,m,d] = trip.startDate.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); })()} – {(() => { const [y,m,d] = trip.endDate.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); })()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.destination}</span>
                </div>
                {trip.collaborators.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Users className="h-4 w-4" />
                        <span>{trip.collaborators.length} travelers</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="bg-muted/20 p-4">
                <Link href={`/trip/${trip.id}`} className="w-full">
                    <Button className="w-full" variant="secondary">Manage Trip</Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
