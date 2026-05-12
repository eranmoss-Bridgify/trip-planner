'use client';

import { Hotel, Attraction } from '@/lib/mock-data';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin, Check } from 'lucide-react';
import { useState } from 'react';

import { useTrips } from '@/context/TripContext';
import { ACTIVE_TRIP_ID } from '@/lib/mock-data';

interface ServiceCardProps {
    service: Hotel | Attraction;
    type: 'Hotel' | 'Attraction';
    isInModal?: boolean;
    onCloseModal?: () => void;
    currentLegId?: string; // Passed down if we know the leg
    onOpenDetails?: (service: Hotel | Attraction, type: 'Hotel' | 'Attraction') => void;
}

export function ServiceCard({ service, type, isInModal, onCloseModal, currentLegId, onOpenDetails }: ServiceCardProps) {
    const [added, setAdded] = useState(false);
    const { trips } = useTrips();

    // Quick fallback for active leg if not provided
    const trip = trips.find(t => t.id === ACTIVE_TRIP_ID) || trips[0];
    const targetLegId = currentLegId || trip?.legs?.[0]?.id;

    const handleCardClick = () => {
        if (onOpenDetails) {
            onOpenDetails(service, type);
        }
    };

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent card click
        if (onOpenDetails) {
            onOpenDetails(service, type);
        }
    };

    return (
        <Card
            className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-all group cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="relative h-48 overflow-hidden">
                <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <Badge className="absolute top-2 right-2 bg-background/80 text-foreground backdrop-blur">
                    {type === 'Hotel' ? 'Hotel' : (service as Attraction).category}
                </Badge>
            </div>
            <CardContent className="p-4 flex-1 space-y-2">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg line-clamp-1">{service.name}</h3>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {service.rating}
                    </div>
                </div>

                {type === 'Hotel' && (service as Hotel).location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {(service as Hotel).location}
                    </div>
                )}

                {(service as Attraction).duration && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {(service as Attraction).duration}
                    </div>
                )}

                <p className="text-sm text-muted-foreground line-clamp-2">
                    {(service as Hotel).description || 'Experience the best of Paris with this curated selection.'}
                </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto border-t bg-muted/20">
                <div className="font-bold text-lg text-primary">
                    {service.price} {service.currency}
                </div>
                <Button
                    size="sm"
                    variant={added ? "secondary" : "default"}
                    onClick={handleAddClick}
                    disabled={added}
                    className="transition-all"
                >
                    {added ? (
                        <>
                            <Check className="h-4 w-4 mr-1" /> Added
                        </>
                    ) : (
                        "View Details"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
