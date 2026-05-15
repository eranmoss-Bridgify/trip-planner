'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrips } from '@/context/TripContext';

interface ServiceCardProps {
    service: any;
    type: 'Hotel' | 'Attraction';
    isInModal?: boolean;
    onCloseModal?: () => void;
    currentLegId?: string;
    onOpenDetails?: (service: any, type: 'Hotel' | 'Attraction') => void;
    checkIn?: string;
    checkOut?: string;
    priceLoading?: boolean;
}

export function ServiceCard({ service, type, isInModal, onCloseModal, currentLegId, onOpenDetails, checkIn, checkOut, priceLoading }: ServiceCardProps) {
    const handleCardClick = () => {
        if (onOpenDetails) {
            onOpenDetails(service, type);
        }
    };

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onOpenDetails) {
            onOpenDetails(service, type);
        }
    };

    const isHotel = type === 'Hotel';
    const hasPrice = service.price != null && service.price > 0;

    return (
        <Card
            className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-all group cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="relative h-48 overflow-hidden bg-muted">
                {service.image ? (
                    <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        No image
                    </div>
                )}
                <Badge className="absolute top-2 right-2 bg-background/80 text-foreground backdrop-blur">
                    {isHotel ? 'Hotel' : (service.category || 'Experience')}
                </Badge>
                {!isHotel && service.isBestSeller && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0 gap-1">
                        <Award className="h-3 w-3" />
                        Best Seller
                    </Badge>
                )}
                {isHotel && service.starRating > 0 && (
                    <div className="absolute top-2 left-2 flex gap-0.5">
                        {Array.from({ length: service.starRating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                )}
            </div>
            <CardContent className="p-4 flex-1 space-y-2">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg line-clamp-1">{service.name}</h3>
                    {service.rating > 0 && (
                        <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {service.rating}
                        </div>
                    )}
                </div>

                {service.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {service.location}
                    </div>
                )}

                {!isHotel && service.duration && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {service.duration}
                    </div>
                )}

                <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description || 'Experience the best of your destination.'}
                </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto border-t bg-muted/20">
                <div>
                    <div className="font-bold text-lg text-primary">
                        {priceLoading ? (
                            <Skeleton className="h-6 w-24" />
                        ) : hasPrice ? (
                            <>
                                {service.price} {service.currency}
                                {isHotel && <span className="text-xs font-normal text-muted-foreground"> / night</span>}
                            </>
                        ) : (
                            <span className="text-sm text-muted-foreground font-normal">No availability</span>
                        )}
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="default"
                    onClick={handleAddClick}
                    className="transition-all"
                >
                    View Details
                </Button>
            </CardFooter>
        </Card>
    );
}
