'use client';

// Accepts both new Flight type from @/types/services and legacy mock-data Flight
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Calendar, Clock, Armchair } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OnboardingWizard } from './OnboardingWizard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FlightCardProps {
    flight?: any;
    hidePlanTrip?: boolean;
    isLoading?: boolean;
}

export function FlightCardSkeleton() {
    return (
        <Card className="overflow-hidden border-none shadow-lg">
            <CardHeader className="bg-primary/10 pb-4 pt-4 rounded-t-xl">
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
                <div className="flex justify-between items-center text-center">
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-16" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-36 col-span-2" />
                </div>
            </CardContent>
        </Card>
    );
}

export function FlightCard({ flight, hidePlanTrip = false, isLoading = false }: FlightCardProps) {
    if (isLoading) return <FlightCardSkeleton />;
    if (!flight) return null;

    const durationText = flight.durationMinutes
        ? `${Math.floor(flight.durationMinutes / 60)}h ${flight.durationMinutes % 60}m`
        : '';

    return (
        <Card className="overflow-hidden border-none shadow-lg bg-linear-to-br from-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between bg-primary/10 pb-4 pt-4 m-0 rounded-t-xl">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary -rotate-45" />
                    {flight.flightNumber ? `Flight ${flight.flightNumber}` : `${flight.origin} → ${flight.destination}`}
                </CardTitle>
                <Badge variant={flight.class === 'Business' ? 'default' : 'secondary'} className="bg-primary text-primary-foreground">
                    {flight.class} Class
                </Badge>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
                <div className="flex justify-between items-center text-center">
                    <div>
                        <div className="text-3xl font-bold text-primary">{flight.origin}</div>
                        <div className="text-sm text-muted-foreground">{flight.originCity}</div>
                    </div>
                    <div className="flex-1 px-4 flex flex-col justify-center relative">
                        {durationText && (
                            <div className="text-xs text-muted-foreground mb-1 text-center bg-card relative z-10 px-2 w-fit mx-auto">
                                {durationText}
                                {flight.stops ? ` · ${flight.stops} stop${flight.stops > 1 ? 's' : ''}` : ' · Direct'}
                            </div>
                        )}
                        <div className="absolute left-4 right-4 top-1/2 -mt-px h-[2px] bg-primary/20"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-1 rounded-full z-10">
                            <Plane className="h-4 w-4 text-primary/50 rotate-90" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary">{flight.destination}</div>
                        <div className="text-sm text-muted-foreground">{flight.destinationCity}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    {flight.departureTime && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-secondary-foreground" />
                            <span>{new Date(flight.departureTime).toLocaleDateString('en-GB')}</span>
                        </div>
                    )}
                    {flight.departureTime && (
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-secondary-foreground" />
                            <span>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                    {flight.airline && (
                        <div className="flex items-center gap-2 col-span-2">
                            <Armchair className="h-4 w-4 text-secondary-foreground" />
                            <span>{flight.airline}{flight.pnr ? ` (PNR: ${flight.pnr})` : ''}</span>
                        </div>
                    )}
                </div>

                {!hidePlanTrip && (
                    <div className="flex justify-end pt-4 border-t border-border/50">
                        <OnboardingWizard
                            trigger={
                                <Button size="sm" className="gap-2">
                                    Plan Trip for this Flight
                                </Button>
                            }
                            initialData={{
                                destination: flight.destinationCity || flight.destination,
                                dates: flight.departureTime ? new Date(flight.departureTime).toLocaleDateString() : '',
                                passengers: flight.passengers
                            }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
