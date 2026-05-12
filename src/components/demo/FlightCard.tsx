import { Flight } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Calendar, Clock, Armchair } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OnboardingWizard } from './OnboardingWizard';
import { Button } from '@/components/ui/button';

interface FlightCardProps {
    flight: Flight;
    hidePlanTrip?: boolean;
}

export function FlightCard({ flight, hidePlanTrip = false }: FlightCardProps) {
    return (
        <Card className="overflow-hidden border-none shadow-lg bg-linear-to-br from-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between bg-primary/10 pb-4 pt-4 m-0 rounded-t-xl">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary -rotate-45" />
                    Flight {flight.flightNumber}
                </CardTitle>
                <Badge variant={flight.class === 'Business' ? 'default' : 'secondary'} className="bg-primary text-primary-foreground">
                    {flight.class} Class
                </Badge>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
                <div className="flex justify-between items-center text-center">
                    <div>
                        <div className="text-3xl font-bold text-primary">{flight.origin}</div>
                        <div className="text-sm text-muted-foreground">Tel Aviv</div>
                    </div>
                    <div className="flex-1 px-4 flex flex-col justify-center relative">
                        <div className="text-xs text-muted-foreground mb-1 text-center bg-card relative z-10 px-2 w-fit mx-auto">4h 30m</div>
                        <div className="absolute left-4 right-4 top-1/2 -mt-px h-[2px] bg-primary/20"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-1 rounded-full z-10">
                            <Plane className="h-4 w-4 text-primary/50 rotate-90" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary">{flight.destination}</div>
                        <div className="text-sm text-muted-foreground">Paris</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-secondary-foreground" />
                        <span>{new Date(flight.departureTime).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-secondary-foreground" />
                        <span>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                        <Armchair className="h-4 w-4 text-secondary-foreground" />
                        <span>{flight.passengers} Passengers (PNR: {flight.pnr})</span>
                    </div>
                </div>

                {!hidePlanTrip && (
                    <div className="flex justify-end pt-4 border-t border-border/50">
                        <OnboardingWizard
                            trigger={
                                <Button size="sm" className="gap-2">
                                    <span className="mr-1">✈️</span> Plan Trip for this Flight
                                </Button>
                            }
                            initialData={{
                                destination: flight.destination === 'CDG' ? 'Paris' : flight.destination,
                                dates: new Date(flight.departureTime).toLocaleDateString(),
                                passengers: flight.passengers
                            }}
                        />
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
