import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Hotel, Attraction, Room, TicketType } from '@/lib/mock-data';
import { useTrips } from '@/context/TripContext';
import { Star, MapPin, Clock, Check, ChevronLeft, ChevronRight, User, Plus, Minus, Calendar as CalendarIcon, FileWarning } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn, formatShortDate } from '@/lib/utils';

interface ServiceDetailsSidebarProps {
    service: Hotel | Attraction | null;
    type: 'Hotel' | 'Attraction' | null;
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    legId: string;
}

export function ServiceDetailsSidebar({ service, type, isOpen, onClose, tripId, legId }: ServiceDetailsSidebarProps) {
    const { addServiceToLeg, getTripById } = useTrips();
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [isAdding, setIsAdding] = useState(false);

    // Form States
    const trip = getTripById(tripId);
    const legData = trip?.legs.find(l => l.id === legId);

    const [dateRange, setDateRange] = useState<{ from: Date, to: Date | undefined } | undefined>(undefined);
    const [date, setDate] = useState(''); // For attractions

    // Hotel State
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [guests, setGuests] = useState(2);

    // Attraction State
    const [timeSlot, setTimeSlot] = useState<string>('10:00 AM');
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    // Reset state when service changes
    useEffect(() => {
        if (isOpen && service) {
            setCurrentImageIdx(0);
            setSelectedRoomId(null);
            setGuests(2);
            setTicketQuantities({});

            // Set default dates
            if (legData) {
                setDateRange({
                    from: new Date(legData.startDate),
                    to: new Date(legData.endDate)
                });
                setDate(new Date(legData.startDate).toISOString().split('T')[0]);
            }
        }
    }, [isOpen, service?.id, legData?.startDate, legData?.endDate]);

    if (!service) return null;

    const isHotel = type === 'Hotel';
    const s = service as any; // Cast for easier access to optional properties we just added

    const images = s.images || [s.image];
    const roomTypes: Room[] = isHotel ? s.roomTypes || [] : [];
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
        if (room) totalPrice = room.pricePerNight * nights;
    } else if (!isHotel) {
        totalPrice = ticketTypes.reduce((sum, t) => {
            return sum + (t.price * (ticketQuantities[t.id] || 0));
        }, 0);
    }

    const canAdd = isHotel ? selectedRoomId !== null : hasSelectedTickets;

    const handleAdd = () => {
        if (!canAdd) return;
        setIsAdding(true);

        // Build the enriched service object to save to the trip
        const customizedService = { ...service };
        if (isHotel && selectedRoomId) {
            const room = roomTypes.find(r => r.id === selectedRoomId);
            (customizedService as any).selectedRoom = room;
            customizedService.price = room?.pricePerNight || service.price;
        } else if (!isHotel && hasSelectedTickets) {
            const selectedTix = ticketTypes.filter(t => ticketQuantities[t.id] > 0).map(t => ({
                ...t,
                quantity: ticketQuantities[t.id]
            }));
            (customizedService as any).selectedTickets = selectedTix;
            (customizedService as any).selectedDate = date;
            (customizedService as any).selectedTime = timeSlot;
            customizedService.price = totalPrice;
        }

        // Add
        const dr = isHotel && dateRange?.from ? {
            checkIn: `${format(dateRange.from, 'yyyy-MM-dd')}T15:00:00Z`,
            checkOut: `${format(dateRange.to || dateRange.from, 'yyyy-MM-dd')}T11:00:00Z`
        } : undefined;

        addServiceToLeg(tripId, legId, customizedService, type!, dr);

        setTimeout(() => {
            setIsAdding(false);
            onClose(); // Close the sidebar
        }, 1000);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full right-0 overflow-y-auto z-50">
                {/* Media Gallery */}
                <div className="relative h-64 sm:h-80 shrink-0 bg-muted">
                    <img
                        src={images[currentImageIdx]}
                        alt={service.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                        <Badge className="bg-background/80 text-foreground backdrop-blur px-3 py-1 text-sm shadow-sm">
                            {isHotel ? 'Hotel' : (service as Attraction).category}
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
                            {s.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {s.location}
                                </div>
                            )}
                            {(!isHotel && s.duration) && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {s.duration}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Overview</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {s.description || 'Enjoy a premium experience curated by El Al. Book now to secure your spot and seamlessly add this to your itinerary.'}
                        </p>
                    </div>

                    {/* Highlights / Amenities */}
                    {(s.highlights && s.highlights.length > 0) && (
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

                    {(s.amenities && s.amenities.length > 0) && (
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

                    {/* Form Controls - Hotel Flow */}
                    {isHotel && (
                        <div className="space-y-6">
                            <h3 className="font-semibold text-lg">Choose your stay</h3>

                            {dateRange?.to && legData && new Date(dateRange.to) > new Date(legData.endDate) && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex gap-3 text-sm">
                                    <FileWarning className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Dates extend beyond this leg</p>
                                        <p className="opacity-90">Checking out after {formatShortDate(legData.endDate)} will prompt you to extend your time in {legData.location}.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background p-4 rounded-xl border shadow-xs">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1"><CalendarIcon className="h-4 w-4 text-muted-foreground" /> Dates ({nights} {nights === 1 ? 'night' : 'nights'})</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}>
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                                            {format(dateRange.to, "LLL dd, y")}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "LLL dd, y")
                                                    )
                                                ) : (
                                                    <span>Pick dates</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={setDateRange as any}
                                                numberOfMonths={2}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1"><User className="h-4 w-4 text-muted-foreground" /> Guests</label>
                                    <Select value={guests.toString()} onValueChange={(v) => setGuests(parseInt(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 Adult</SelectItem>
                                            <SelectItem value="2">2 Adults</SelectItem>
                                            <SelectItem value="3">3 Adults</SelectItem>
                                            <SelectItem value="4">4 Adults</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {roomTypes.length > 0 ? (
                                <div className="space-y-4 mt-6">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Available Rooms</h4>
                                    {roomTypes.map(room => (
                                        <div
                                            key={room.id}
                                            className={`border rounded-xl p-4 transition-all cursor-pointer flex gap-4 ${selectedRoomId === room.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'bg-background hover:border-primary/50'}`}
                                            onClick={() => setSelectedRoomId(room.id)}
                                        >
                                            {room.image && (
                                                <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                                                    <img src={room.image} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 flex flex-col">
                                                <div className="flex justify-between items-start">
                                                    <h5 className="font-semibold">{room.name}</h5>
                                                    <div className="font-bold">{room.pricePerNight} {room.currency}</div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{room.description}</p>
                                                <div className="flex items-center justify-between mt-auto pt-2">
                                                    <div className="text-xs font-medium text-muted-foreground flex gap-2">
                                                        <span><User className="h-3 w-3 inline mr-0.5" /> Up to {room.capacity}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">/ night</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">No room data available for this dummy service.</p>
                            )}
                        </div>
                    )}

                    {/* Form Controls - Attraction Flow */}
                    {!isHotel && (
                        <div className="space-y-6">
                            <h3 className="font-semibold text-lg">Check Availability</h3>
                            <div className="grid grid-cols-2 gap-4 bg-background p-4 rounded-xl border shadow-xs">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-4 w-4 text-muted-foreground" /> Date</label>
                                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground" /> Time</label>
                                    <Select value={timeSlot} onValueChange={setTimeSlot}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
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
                                                    <Button
                                                        variant={ticketQuantities[ticket.id] ? "default" : "outline"}
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full"
                                                        onClick={() => handleTicketChange(ticket.id, -1)}
                                                        disabled={!ticketQuantities[ticket.id]}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-6 text-center font-medium text-lg">{ticketQuantities[ticket.id] || 0}</span>
                                                    <Button
                                                        variant={ticketQuantities[ticket.id] ? "default" : "outline"}
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full"
                                                        onClick={() => handleTicketChange(ticket.id, 1)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">No ticket data available for this dummy service.</p>
                            )}
                        </div>
                    )}

                    {/* Padding block so scroll reaches past floating footer */}
                    <div className="h-24"></div>
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
                                    {isHotel ? 'Select a room below' : 'Select tickets below'}
                                </div>
                            )}
                        </div>
                        <Button
                            size="lg"
                            className="flex-1 max-w-[200px]"
                            disabled={!canAdd || isAdding}
                            onClick={handleAdd}
                        >
                            {isAdding ? "Adding..." : (isHotel ? "Add Room to Trip" : "Add Tickets to Trip")}
                        </Button>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}
