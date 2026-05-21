'use client';

import { ServiceCard } from '@/components/demo/ServiceCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Search, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { use, useState } from 'react';
import { useTrips } from '@/context/TripContext';
import { ServiceDetailsSidebar } from '@/components/demo/ServiceDetailsSidebar';
import { useBridgifySearch } from '@/lib/api-client';
import { bridgifyToAttraction } from '@/lib/bridgify-adapter';
import type { Attraction } from '@/types/services';

export default function ExplorePage({ params, searchParams }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ date?: string }>
}) {
    const { id } = use(params);
    const resolvedSearchParams = use(searchParams);
    const date = resolvedSearchParams.date;

    const { trips } = useTrips();
    const trip = trips.find(t => t.id === id);
    // Find the leg that contains the searched date; fall back to the first leg
    const leg = date
        ? (trip?.legs.find(l => l.startDate.split('T')[0] <= date && l.endDate.split('T')[0] >= date) ?? trip?.legs[0])
        : trip?.legs[0];
    const destination = leg?.location ?? 'Barcelona';

    const [searchTerm, setSearchTerm] = useState('tours');
    const [debouncedSearch, setDebouncedSearch] = useState('tours');

    const { data, error, isLoading, mutate } = useBridgifySearch({
        textSearch: debouncedSearch,
        cityName: destination,
        pageSize: 30,
    });

    const attractions: Attraction[] = (data?.attractions ?? []).map(bridgifyToAttraction);

    const [isServiceDetailsOpen, setIsServiceDetailsOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Attraction | null>(null);

    const handleOpenDetails = (service: any) => {
        setSelectedService(service);
        setIsServiceDetailsOpen(true);
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        clearTimeout((window as any).__exploreDebounce);
        (window as any).__exploreDebounce = setTimeout(() => setDebouncedSearch(value), 300);
    };

    return (
        <div className="container px-4 md:px-6 py-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/trip/${id}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Explore {destination}</h1>
                    {date && (
                        <p className="text-muted-foreground">
                            Finding activities for {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </div>
            </div>

            <ServiceDetailsSidebar
                isOpen={isServiceDetailsOpen}
                onClose={() => setIsServiceDetailsOpen(false)}
                service={selectedService}
                type="Attraction"
                tripId={trip?.id ?? id}
                legId={leg?.id}
                defaultCheckIn={date ?? leg?.startDate?.split('T')[0]}
            />

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Search experiences in ${destination}...`}
                        className="pl-10 bg-background"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border overflow-hidden">
                            <Skeleton className="h-48 w-full rounded-none" />
                            <div className="p-4 space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex items-center gap-4">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <p className="text-sm text-destructive flex-1">Could not load experiences</p>
                    <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Retry
                    </Button>
                </div>
            ) : attractions.length > 0 ? (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        {attractions.length} experience{attractions.length !== 1 ? 's' : ''} in {destination}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {attractions.map((attraction) => (
                            <ServiceCard
                                key={attraction.id}
                                service={attraction}
                                type="Attraction"
                                onOpenDetails={handleOpenDetails}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border bg-muted/30 p-12 text-center space-y-3">
                    <p className="text-muted-foreground text-lg">No experiences found</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                </div>
            )}
        </div>
    );
}
