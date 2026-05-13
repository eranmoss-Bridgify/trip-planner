'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Room, TicketType } from '@/types/services';
import { useTrips } from '@/context/TripContext';
import { postAvailability } from '@/lib/api-client';
import {
    Star, MapPin, Clock, Check, User, Plus, Minus,
    Calendar as CalendarIcon, FileWarning, Loader2, AlertCircle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { formatShortDate } from '@/lib/utils';

interface ServiceDetailsSidebarProps {
    service: any | null;
    type: 'Hotel' | 'Attraction' | null;
    isOpen: boolean;
    onClose: () => void;
    tripId?: string;
    legId?: string;
    defaultCheckIn?: string;
    defaultCheckOut?: string;
}

export function ServiceDetailsSidebar({ service, type, isOpen, onClose, tripId, legId, defaultCheckIn, defaultCheckOut }: ServiceDetailsSidebarProps) {
    const { addServiceToLeg, getTripById } = useTrips();
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [isAdding, setIsAdding] = useState(false);

    const trip = tripId ? getTripById(tripId) : undefined;
    const legData = trip?.legs.find((l: any) => l.id === legId);

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date | undefined } | undefined>(undefined);
    const [date, setDate] = useState('');

    // Hotel state
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [guests, setGuests] = useState(2);
    const [liveRooms, setLiveRooms] = useState<Room[]>([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [rateKey, setRateKey] = useState<string | null>(null);

    // Attraction state
    const [timeSlot, setTimeSlot] = useState<string>('10:00 AM');
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        if (isOpen && service) {
            setCurrentImageIdx(0);
            setSelectedRoomId(null);
            setGuests(2);
            setTicketQuantities({});
            setLiveRooms([]);
            setAvailabilityError(null);
            setRateKey(null);

            if (legData) {
                setDateRange({
                    from: new Date(legData.startDate),
                    to: new Date(legData.endDate),
                });
                setDate(new Date(legData.startDate).toISOString().split('T')[0]);
            } else if (defaultCheckIn && defaultCheckOut) {
                setDateRange({
                    from: new Date(defaultCheckIn),
                    to: new Date(defaultCheckOut),
                });
                setDate(defaultCheckIn);
            }
        }
    }, [isOpen, service?.id, legData?.startDate, legData?.endDate]);

    // Fetch live availability when dates change (hotels only)
    useEffect(() => {
        if (!isOpen || !service || type !== 'Hotel' || !dateRange?.from || !dateRange?.to) return;

        const fetchAvailability = async () => {
            setAvailabilityLoading(true);
            setAvailabilityError(null);
            setLiveRooms([]);
            setSelectedRoomId(null);
            setRateKey(null);

            const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
            const dateTo = format(dateRange.to!, 'yyyy-MM-dd');

            const result = await postAvailability(service.id, {
                date_from: dateFrom,
                date_to: dateTo,
                adults: guests,
                children: 0,
            });

            setAvailabilityLoading(false);

            if (!result.ok) {
                setAvailabilityError(result.error);
                return;
            }

            const rooms = result.data?.data?.rooms ?? [];
            const mapped: Room[] = rooms.flatMap((room: any) =>
                (room.rates ?? []).map((rate: any, idx: number) => ({
                    id: `${room.code}-${idx}`,
                    name: room.name || room.code,
                    description: rate.boardName || '',
                    capacity: guests,
                    pricePerNight: rate.net,
                    currency: rate.currency || 'EUR',
                    amenities: [],
                    image: '',
                    boardName: rate.boardName,
                    rateKey: rate.rateKey,
                    cancellationPolicies: rate.cancellationPolicies,
                })),
            );

            setLiveRooms(mapped);
        };

        fetchAvailability();
    }, [isOpen, service?.id, type, dateRange?.from?.getTime(), dateRange?.to?.getTime(), guests]);

    if (!service) return null;

    const isHotel = type === 'Hotel';
    const s = service as any;
    const images = s.images?.length ? s.images : s.image ? [s.image] : [];
    const roomTypes: Room[] = isHotel ? liveRooms : [];
    const ticketTypes: TicketType[] = !isHotel ? s.ticketTypes || [] : [];

    const handleTicketChange = (ticketId: string, delta: number) => {
        setTicketQuantities(prev => {
            const current = prev[ticketId] || 0;
            const next = Math.max(0, current + delta);
            return { ...prev, [ticketId]: next };
        });
    };

    const hasSelectedTickets = Object.values(ticketQuantities).some(q => q > 0);

    let totalPrice = 0;
    let nights = 1;
    if (dateRange?.from && dateRange?.to) {
        nights = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));
    }

    if (isHotel && selectedRoomId) {
        const room = roomTypes.find(r => r.id === selectedRoomId);
        if (room) totalPrice = room.pricePerNight;
    } else if (!isHotel) {
        totalPrice = ticketTypes.reduce((sum, t) => sum + (t.price * (ticketQuantities[t.id] || 0)), 0);
    }

    const canAdd = isHotel ? selectedRoomId !== null : hasSelectedTickets;

    const handleAdd = () => {
        if (!canAdd) return;
        setIsAdding(true);

        const customizedService = { ...service };
        if (isHotel && selectedRoomId) {
            const room = roomTypes.find(r => r.id === selectedRoomId);
            (customizedService as any).selectedRoom = room;
            customizedService.price = room?.pricePerNight || service.price;
        } else if (!isHotel && hasSelectedTickets) {
            const selectedTix = ticketTypes.filter(t => ticketQuantities[t.id] > 0).map(t => ({
                ...t, quantity: ticketQuantities[t.id],
            }));
            (customizedService as any).selectedTickets = selectedTix;
            (customizedService as any).selectedDate = date;
            (customizedService as any).selectedTime = timeSlot;
            customizedService.price = totalPrice;
        }

        const dr = isHotel && dateRange?.from ? {
            checkIn: `${format(dateRange.from, 'yyyy-MM-dd')}T15:00:00Z`,
            checkOut: `${format(dateRange.to || dateRange.from, 'yyyy-MM-dd')}T11:00:00Z`,
        } : undefined;

        if (tripId && legId) {
            addServiceToLeg(tripId, legId, customizedService, type!, dr);
        }

        setTimeout(() => {
            setIsAdding(false);
            onClose();
        }, 1000);
    };

    const hasTrip = Boolean(tripId && legId);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full right-0 overflow-y-auto z-50">
                {/* Image gallery */}
                <div className="relative h-64 sm:h-80 shrink-0 bg-muted">
                    {images.length > 0 ? (
                        <img
                            src={images[currentImageIdx]}
                            alt={service.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image available
                        </div>
                    )}
                    <div className="absolute top-4 left-4">
                        <Badge className="bg-background/80 text-foreground backdrop-blur px-3 py-1 text-sm shadow-sm">
                            {isHotel ? 'Hotel' : (service.category || 'Experience')}
                        </Badge>
                    </div>
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
                            {images.map((img: string, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentImageIdx(idx)}
                                    className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${idx === currentImageIdx ? 'border-primary shadow-sm scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col gap-6 bg-slate-50/50 relative">
                    <div>
                        <div className="flex justify-between items-start gap-4">
                            <SheetTitle className="text-2xl font-bold leading-tight">{service.name}</SheetTitle>
                            {service.rating > 0 && (
                                <div className="flex items-center gap-1 text-base font-bold shrink-0 bg-yellow-100 px-2 py-1 rounded-md text-yellow-800">
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    {service.rating}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                            {s.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" /> {s.location}
                                </div>
                            )}
                            {!isHotel && s.duration && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" /> {s.duration}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-lg mb-2">Overview</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {s.description || 'Enjoy a premium experience. Book now to secure your spot.'}
                        </p>
                    </div>

                    {s.highlights?.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Highlights</h3>
                            <ul className="space-y-2">
                                {s.highlights.map((h: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                        <span>{h}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {s.amenities?.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Amenities</h3>
                            <div className="flex flex-wrap gap-2">
                                {s.amenities.map((a: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="bg-background font-normal border-muted">{a}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-px bg-border w-full my-2" />

                    {/* Hotel Flow */}
                    {isHotel && (
                        <div className="space-y-6">
                            <h3 className="font-semibold text-lg">Choose your stay</h3>

                            {dateRange?.to && legData && new Date(dateRange.to) > new Date(legData.endDate) && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex gap-3 text-sm">
                                    <FileWarning className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Dates extend beyond this leg</p>
                                        <p className="opacity-90">Checking out after {formatShortDate(legData.endDate)} will prompt you to extend.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background p-4 rounded-xl border shadow-xs">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Dates ({nights} {nights === 1 ? 'night' : 'nights'})
                                    </label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!dateRange && 'text-muted-foreground'}`}>
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</>
                                                    ) : format(dateRange.from, 'LLL dd, y')
                                                ) : <span>Pick dates</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange as any} numberOfMonths={2} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1">
                                        <User className="h-4 w-4 text-muted-foreground" /> Guests
                                    </label>
                                    <Select value={guests.toString()} onValueChange={(v) => setGuests(parseInt(v))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 Adult</SelectItem>
                                            <SelectItem value="2">2 Adults</SelectItem>
                                            <SelectItem value="3">3 Adults</SelectItem>
                                            <SelectItem value="4">4 Adults</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {availabilityLoading ? (
                                <div className="space-y-4 mt-6">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability...
                                    </h4>
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <div key={i} className="border rounded-xl p-4 flex gap-4">
                                            <Skeleton className="w-24 h-20 rounded-lg" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-5 w-40" />
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-4 w-32" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : availabilityError ? (
                                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                                    <p className="text-sm text-destructive">Could not check availability. Try different dates.</p>
                                </div>
                            ) : roomTypes.length > 0 ? (
                                <div className="space-y-4 mt-6">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Available Rooms</h4>
                                    {roomTypes.map(room => (
                                        <div
                                            key={room.id}
                                            className={`border rounded-xl p-4 transition-all cursor-pointer ${selectedRoomId === room.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'bg-background hover:border-primary/50'}`}
                                            onClick={() => {
                                                setSelectedRoomId(room.id);
                                                setRateKey(room.rateKey ?? null);
                                            }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h5 className="font-semibold">{room.name}</h5>
                                                    {room.boardName && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">{room.boardName}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold">{room.pricePerNight} {room.currency}</div>
                                                    <div className="text-xs text-muted-foreground">total for {nights} nights</div>
                                                </div>
                                            </div>
                                            {room.cancellationPolicies?.length ? (
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Cancellation fee from {new Date(room.cancellationPolicies[0].from).toLocaleDateString()}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : dateRange?.from && dateRange?.to ? (
                                <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">
                                    No rooms available for the selected dates.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">
                                    Select dates above to check room availability.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Attraction Flow */}
                    {!isHotel && (
                        <div className="space-y-6">
                            <h3 className="font-semibold text-lg">Check Availability</h3>
                            <div className="grid grid-cols-2 gap-4 bg-background p-4 rounded-xl border shadow-xs">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Date
                                    </label>
                                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-muted-foreground" /> Time
                                    </label>
                                    <Select value={timeSlot} onValueChange={setTimeSlot}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                                            <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                                            <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                                            <SelectItem value="14:00 PM">14:00 PM</SelectItem>
                                            <SelectItem value="16:00 PM">16:00 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {ticketTypes.length > 0 ? (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Select Tickets</h4>
                                    <div className="bg-background rounded-xl border shadow-xs divide-y">
                                        {ticketTypes.map(ticket => (
                                            <div key={ticket.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold">{ticket.name}</div>
                                                    {ticket.description && <div className="text-xs text-muted-foreground">{ticket.description}</div>}
                                                    <div className="text-primary font-medium mt-1">{ticket.price} {ticket.currency}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button variant={ticketQuantities[ticket.id] ? 'default' : 'outline'} size="icon" className="h-8 w-8 rounded-full" onClick={() => handleTicketChange(ticket.id, -1)} disabled={!ticketQuantities[ticket.id]}>
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-6 text-center font-medium text-lg">{ticketQuantities[ticket.id] || 0}</span>
                                                    <Button variant={ticketQuantities[ticket.id] ? 'default' : 'outline'} size="icon" className="h-8 w-8 rounded-full" onClick={() => handleTicketChange(ticket.id, 1)}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">
                                    Ticket availability coming soon.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="h-24" />
                </div>

                {/* Sticky Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/90 backdrop-blur-md z-50">
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            {(isHotel && selectedRoomId) || (!isHotel && hasSelectedTickets) ? (
                                <>
                                    <span className="text-sm text-muted-foreground">Total price</span>
                                    <div className="text-2xl font-bold flex items-center gap-1">
                                        {totalPrice} <span className="text-lg">{service.currency}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm font-medium text-muted-foreground">
                                    {isHotel ? 'Select a room to see pricing' : 'Select tickets above'}
                                </div>
                            )}
                        </div>
                        {hasTrip && (
                            <Button
                                size="lg"
                                className="flex-1 max-w-[200px]"
                                disabled={!canAdd || isAdding}
                                onClick={handleAdd}
                            >
                                {isAdding ? 'Adding...' : isHotel ? 'Add Room to Trip' : 'Add Tickets to Trip'}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
