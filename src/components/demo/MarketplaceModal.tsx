'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Compass, AlertCircle, RefreshCw, Calendar, MapPin } from 'lucide-react';
import { ServiceCard } from '@/components/demo/ServiceCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBridgifySearch } from '@/lib/api-client';
import { bridgifyToAttraction } from '@/lib/bridgify-adapter';
import { VIBE_TO_SEARCH, vibestoSearchTerm } from '@/lib/utils';

interface MarketplaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination?: string;
    defaultTab?: string;
    vibes?: string[];
    legStartDate?: string;
    legEndDate?: string;
    onOpenServiceDetails?: (service: any, type: 'Hotel' | 'Attraction') => void;
}

export function MarketplaceModal({ isOpen, onClose, destination = "Barcelona", vibes, legStartDate, legEndDate, onOpenServiceDetails }: MarketplaceModalProps) {
    const defaultSearch = vibestoSearchTerm(vibes);
    const [searchTerm, setSearchTerm] = useState(defaultSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(defaultSearch);

    const { data, error, isLoading, mutate } = useBridgifySearch({
        textSearch: debouncedSearch,
        cityName: destination,
    });

    const attractions = (data?.attractions ?? []).map(bridgifyToAttraction);

    useEffect(() => {
        if (isOpen) {
            const term = vibestoSearchTerm(vibes);
            setSearchTerm(term);
            setDebouncedSearch(term);
        }
    }, [isOpen, vibes]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Compass className="h-6 w-6 text-blue-500" />
                        Explore {destination}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {destination && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {destination}
                            </span>
                        )}
                        {legStartDate && legEndDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(legStartDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
                                {new Date(legEndDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="mb-6 sticky top-0 bg-slate-50/50 z-10 py-2 backdrop-blur-sm space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search experiences..."
                                className="pl-10 bg-background shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {vibes && vibes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {vibes.map(vibe => {
                                    const term = VIBE_TO_SEARCH[vibe];
                                    if (!term) return null;
                                    const isActive = searchTerm === term;
                                    const label = vibe.charAt(0).toUpperCase() + vibe.slice(1);
                                    return (
                                        <button
                                            key={vibe}
                                            onClick={() => setSearchTerm(term)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <MarketplaceCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 flex flex-col items-center gap-4">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                            <p className="text-sm text-destructive">Could not load experiences</p>
                            <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
                                <RefreshCw className="h-4 w-4" /> Retry
                            </Button>
                        </div>
                    ) : attractions.length > 0 ? (
                        <>
                            <p className="text-sm text-muted-foreground mb-4">
                                {attractions.length} experience{attractions.length !== 1 ? 's' : ''} found
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {attractions.map((attraction) => (
                                    <ServiceCard
                                        key={attraction.id}
                                        service={attraction}
                                        type="Attraction"
                                        isInModal
                                        onCloseModal={onClose}
                                        onOpenDetails={onOpenServiceDetails}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border bg-muted/30 p-12 text-center">
                            <p className="text-muted-foreground">
                                No experiences found for &quot;{debouncedSearch}&quot; in {destination}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MarketplaceCardSkeleton() {
    return (
        <div className="rounded-xl border overflow-hidden">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
            </div>
            <div className="p-4 pt-0 flex justify-between items-center border-t">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-9 w-24" />
            </div>
        </div>
    );
}
