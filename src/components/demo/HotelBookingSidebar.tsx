import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hotel } from '@/lib/mock-data';
import { useTrips } from '@/context/TripContext';
import { Star, MapPin, Check, FileWarning, CalendarIcon, User, X } from 'lucide-react';
import { format } from 'date-fns';

interface HotelBookingSidebarProps {
    service: Hotel | null;
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    legId: string;
    hotelIndex: number;
    checkIn: string;
    checkOut: string;
}

export function HotelBookingSidebar({ service, isOpen, onClose, tripId, legId, hotelIndex, checkIn, checkOut }: HotelBookingSidebarProps) {
    const { removeHotel } = useTrips();

    if (!service) return null;

    const images = service.images || [service.image];

    const handleCancelBooking = () => {
        removeHotel(tripId, legId, hotelIndex);
        onClose();
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full right-0 overflow-y-auto z-50">
                {/* Media Gallery */}
                <div className="relative h-64 sm:h-80 shrink-0 bg-muted">
                    <img
                        src={images[0]}
                        alt={service.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                        <Badge className="bg-green-500/90 text-white backdrop-blur px-3 py-1 text-sm shadow-sm">
                            Purchased
                        </Badge>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col gap-6 bg-slate-50/50 relative">
                    {/* Header Details */}
                    <div>
                        <div className="flex justify-between items-start gap-4">
                            <SheetTitle className="text-2xl font-bold leading-tight">{service.name}</SheetTitle>
                            <div className="flex items-center gap-1 text-base font-bold shrink-0 bg-yellow-100 px-2 py-1 rounded-md text-yellow-800">
                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                {service.rating}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                            {service.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {service.location}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-background border rounded-xl p-4 shadow-xs space-y-4">
                        <h3 className="font-semibold border-b pb-2">Booking Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Check In</div>
                                <div className="font-medium flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-primary" />
                                    {format(new Date(checkIn), 'MMM dd, yyyy')}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Check Out</div>
                                <div className="font-medium flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-primary" />
                                    {format(new Date(checkOut), 'MMM dd, yyyy')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Overview</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {service.description || 'Enjoy a premium experience. Book now to secure your spot and seamlessly add this to your itinerary.'}
                        </p>
                    </div>

                    {/* Padding block so scroll reaches past floating footer */}
                    <div className="h-24"></div>
                </div>

                {/* Sticky Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/90 backdrop-blur-md z-50">
                    <div className="flex justify-end items-center gap-4">
                        <Button
                            variant="destructive"
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={handleCancelBooking}
                        >
                            <X className="w-4 h-4 mr-2" /> Cancel Booking
                        </Button>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}
