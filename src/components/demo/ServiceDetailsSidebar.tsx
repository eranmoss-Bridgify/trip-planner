'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Room } from '@/types/services';
import { useTrips } from '@/context/TripContext';
import {
    Star, MapPin, Clock, Check, User, Plus, Minus,
    Calendar as CalendarIcon, FileWarning, Loader2, AlertCircle,
    ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { formatShortDate, fmtPrice } from '@/lib/utils';
import { useBridgifyAvailability } from '@/lib/api-client';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';

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
    const { addServiceToLeg, getTripById, trips } = useTrips();
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [isAdding, setIsAdding] = useState(false);

    // Marketplace mode: no trip/leg passed in — user picks trip, leg auto-matched by location
    const [mktTripId, setMktTripId] = useState<string>('');
    const [mktLegId, setMktLegId] = useState<string>('');

    const mktTrip = trips.find(t => t.id === mktTripId);
    const mktLeg = mktTrip?.legs.find(l => l.id === mktLegId);

    // Returns the leg whose location best matches the attraction's location string.
    // e.g. attraction.location="Barcelona, Spain" matches leg.location="Barcelona"
    function findMatchingLeg(legs: typeof mktTrip.legs, attractionLocation: string): string | null {
        if (!legs?.length || !attractionLocation) return null;
        const haystack = attractionLocation.toLowerCase();
        // Exact or substring match first
        const exact = legs.find(l => l.location && haystack.includes(l.location.toLowerCase()));
        if (exact) return exact.id;
        // Word-level match: any word in the leg location appears in the attraction location
        const word = legs.find(l =>
            l.location?.toLowerCase().split(/[\s,]+/).some(w => w.length > 3 && haystack.includes(w))
        );
        return word?.id ?? null;
    }

    // isHotel declared early — used in hooks below
    const isHotel = type === 'Hotel';

    const trip = tripId ? getTripById(tripId) : undefined;
    const legData = trip?.legs.find((l: any) => l.id === legId);

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date | undefined } | undefined>(undefined);

    // Hotel state
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [guests, setGuests] = useState(2);
    const [liveRooms, setLiveRooms] = useState<Room[]>([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [rateKey, setRateKey] = useState<string | null>(null);

    // Attraction state — manual check pattern (matches TOS integration hub)
    const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [attractionAdults, setAttractionAdults] = useState(2);
    const [hasChecked, setHasChecked] = useState(false);

    // Date inputs pre-filled from leg.
    // Use .split('T')[0] directly — avoids new Date() UTC round-trip that
    // shifts dates when the stored value has a time component (e.g. '2026-06-14T21:00:00Z').
    const defaultFrom = legData
        ? legData.startDate.split('T')[0]
        : defaultCheckIn ?? new Date().toISOString().split('T')[0];
    const defaultTo = legData
        ? legData.endDate.split('T')[0]
        : defaultCheckOut ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [checkFrom, setCheckFrom] = useState(defaultFrom);
    const [checkTo, setCheckTo] = useState(defaultTo);

    // Use uuid for availability (external_id is not accepted by the availability endpoint)
    const availUuid = service?.availabilityUuid ?? null;
    const serviceAvailType: string | null = service?.availabilityType ?? null;
    const isOpenVoucher = serviceAvailType === 'BSN';

    // Only fetch after user clicks "Check Availability" (and only for non-BSN products)
    const { data: availData, isLoading: availLoading, isValidating: availValidating, error: availError } = useBridgifyAvailability({
        productId: isOpen && !isHotel && service && hasChecked && !isOpenVoucher ? availUuid : null,
        dateFrom: checkFrom || undefined,
        dateTo: checkTo || undefined,
        availabilityType: serviceAvailType,
    });

    const slots: { date: string; times?: string[] }[] = availData?.data?.slots ?? [];
    const selectedSlot = slots.find(s => s.date === selectedSlotDate) ?? null;
    const slotTimes: string[] = selectedSlot?.times ?? [];

    useEffect(() => {
        if (isOpen && service) {
            setCurrentImageIdx(0);
            setSelectedRoomId(null);
            setGuests(2);
            setAttractionAdults(2);
            setSelectedSlotDate(null);
            setSelectedTime(null);
            setHasChecked(false);
            setLiveRooms([]);
            setAvailabilityError(null);
            setRateKey(null);
            setMktTripId('');
            setMktLegId('');
            setAttractionAdults(trip?.passengers?.adults ?? 2);

            // Auto-check availability when opened from a trip context (skip manual button click)
            const hasContext = Boolean(tripId && legId);
            if (!isHotel && hasContext) {
                setHasChecked(true);
            } else {
                setHasChecked(false);
            }

            const from = legData
                ? legData.startDate.split('T')[0]
                : defaultCheckIn ?? new Date().toISOString().split('T')[0];
            const to = legData
                ? legData.endDate.split('T')[0]
                : defaultCheckOut ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            setCheckFrom(from);
            setCheckTo(to);

            if (legData) {
                setDateRange({ from: new Date(legData.startDate), to: new Date(legData.endDate) });
            } else if (defaultCheckIn && defaultCheckOut) {
                setDateRange({ from: new Date(defaultCheckIn), to: new Date(defaultCheckOut) });
            }
        }
    }, [isOpen, service?.id, legData?.startDate, legData?.endDate]);

    // When a marketplace trip is selected, auto-match leg by attraction location
    useEffect(() => {
        if (!mktTrip || isHotel) return;
        const matched = findMatchingLeg(mktTrip.legs, (service as any)?.location ?? '');
        if (matched) setMktLegId(matched);
        else setMktLegId(''); // no match → show leg picker
    }, [mktTripId]);

    // When a marketplace leg is picked, adopt its dates and auto-check availability
    useEffect(() => {
        if (!mktLeg || isHotel) return;
        const from = mktLeg.startDate.split('T')[0];
        const to = mktLeg.endDate.split('T')[0];
        setCheckFrom(from);
        setCheckTo(to);
        setSelectedSlotDate(null);
        setSelectedTime(null);
        setHasChecked(true);
    }, [mktLegId]);

    // Reset time selection when the date changes
    useEffect(() => {
        setSelectedTime(null);
    }, [selectedSlotDate]);

    if (!service) return null;

    const s = service as any;
    const images = s.images?.length ? s.images : s.image ? [s.image] : [];
    const roomTypes: Room[] = isHotel ? liveRooms : [];

    let totalPrice = 0;
    let nights = 1;
    if (dateRange?.from && dateRange?.to) {
        nights = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));
    }

    if (isHotel && selectedRoomId) {
        const room = roomTypes.find(r => r.id === selectedRoomId);
        if (room) totalPrice = room.pricePerNight;
    } else if (!isHotel && s.price > 0) {
        totalPrice = s.price * attractionAdults;
    }

    const availInFlight = availLoading || availValidating;
    // Availability failed after a manual check (sandbox limitation) → date-picker fallback
    const availFailed = hasChecked && !availInFlight && !!availError;

    const attractionReady = isOpenVoucher
        ? attractionAdults > 0
        : availFailed
            ? selectedSlotDate !== null && attractionAdults > 0
            : selectedSlotDate !== null && attractionAdults > 0 && (slotTimes.length === 0 || selectedTime !== null);

    const canAdd = isHotel ? selectedRoomId !== null : attractionReady;

    const handleAdd = () => {
        if (!canAdd) return;
        setIsAdding(true);

        const customizedService = { ...service };
        if (isHotel && selectedRoomId) {
            const room = roomTypes.find(r => r.id === selectedRoomId);
            (customizedService as any).selectedRoom = room;
            customizedService.price = room?.pricePerNight || service.price;
        } else if (!isHotel) {
            (customizedService as any).selectedDate = selectedSlotDate;
            (customizedService as any).selectedTime = selectedTime;
            (customizedService as any).selectedAdults = attractionAdults;
            customizedService.price = totalPrice || s.price;
        }

        const dr = isHotel && dateRange?.from ? {
            checkIn: `${format(dateRange.from, 'yyyy-MM-dd')}T15:00:00Z`,
            checkOut: `${format(dateRange.to || dateRange.from, 'yyyy-MM-dd')}T11:00:00Z`,
        } : undefined;

        const effectiveTripId = tripId || mktTripId;
        const effectiveLegId = legId || mktLegId;
        if (effectiveTripId && effectiveLegId) {
            // Use the availability slot date for day placement (matches leg days by date)
            if (!isHotel && selectedSlotDate) {
                (customizedService as any).selectedDate = selectedSlotDate;
            }
            addServiceToLeg(effectiveTripId, effectiveLegId, customizedService, type!, dr);
        }

        setTimeout(() => {
            setIsAdding(false);
            onClose();
        }, 1000);
    };

    const hasTrip = Boolean(tripId && legId);
    // Marketplace mode is ready once a trip + leg are selected (date comes from availability slot)
    const mktReady = !hasTrip && Boolean(mktTripId && mktLegId);

    function formatSlotDate(dateStr: string) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full right-0 overflow-hidden z-50">
                {/* Image gallery */}
                <div className="relative h-64 sm:h-80 shrink-0 bg-muted overflow-hidden">
                    {images.length > 0 ? (
                        <img
                            src={images[currentImageIdx]}
                            alt={service.name}
                            className="w-full h-full object-cover transition-opacity duration-200"
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
                        <>
                            <button
                                onClick={() => setCurrentImageIdx(i => (i - 1 + images.length) % images.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/75 p-2 text-white transition-colors z-10 shadow-lg"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                                onClick={() => setCurrentImageIdx(i => (i + 1) % images.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/75 p-2 text-white transition-colors z-10 shadow-lg"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                            <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-white text-xs font-medium tabular-nums">
                                {currentImageIdx + 1} / {images.length}
                            </div>
                        </>
                    )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                <div className="p-6 flex flex-col gap-6 bg-slate-50/50">
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
                                                    <div className="font-bold">{fmtPrice(room.pricePerNight, room.currency)}</div>
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
                        <div className="space-y-5">
                            <h3 className="font-semibold text-lg">Book this experience</h3>

                            {/* Step 1 — No trips yet: prompt to create one */}
                            {!hasTrip && trips.length === 0 && (
                                <div className="bg-background rounded-xl border shadow-xs p-5 space-y-3 text-center">
                                    <p className="text-sm font-semibold">You don't have a trip yet</p>
                                    <p className="text-xs text-muted-foreground">Create a trip first and we'll add this activity to the right day automatically.</p>
                                    <OnboardingWizard
                                        trigger={
                                            <Button className="w-full gap-2">
                                                <Plus className="h-4 w-4" /> Plan a trip
                                            </Button>
                                        }
                                    />
                                </div>
                            )}

                            {/* Step 1 — Trip selector (marketplace / no-trip context only) */}
                            {!hasTrip && trips.length > 0 && (
                                <div className="bg-background rounded-xl border shadow-xs p-4 space-y-3">
                                    <p className="text-sm font-semibold flex items-center gap-1.5">
                                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
                                        Which trip?
                                    </p>
                                    <Select value={mktTripId} onValueChange={v => { setMktTripId(v); setHasChecked(false); setSelectedSlotDate(null); }}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select trip" /></SelectTrigger>
                                        <SelectContent>
                                            {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    {/* Show matched leg as a confirmation pill; fallback to picker if no match */}
                                    {mktTripId && mktLegId && mktLeg && (
                                        <div className="flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="font-medium">{mktLeg.title || mktLeg.location}</span>
                                                <span className="text-indigo-400 mx-1">·</span>
                                                <CalendarIcon className="h-3 w-3 shrink-0" />
                                                {formatShortDate(mktLeg.startDate)} – {formatShortDate(mktLeg.endDate)}
                                            </span>
                                            <button className="underline text-indigo-500 hover:text-indigo-700 ml-2 whitespace-nowrap" onClick={() => setMktLegId('')}>Change</button>
                                        </div>
                                    )}
                                    {mktTripId && !mktLegId && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                                                No destination matched "{(service as any)?.location}" — pick one:
                                            </p>
                                            <Select value={mktLegId} onValueChange={v => setMktLegId(v)}>
                                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select destination" /></SelectTrigger>
                                                <SelectContent>
                                                    {mktTrip?.legs.map(l => <SelectItem key={l.id} value={l.id}>{l.title || l.location}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Trip context banner — when opened from within a trip */}
                            {trip && legData && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
                                    <span className="font-semibold w-full truncate">{trip.name}</span>
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{legData.title || legData.location}</span>
                                    <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3 shrink-0" />{formatShortDate(legData.startDate)} – {formatShortDate(legData.endDate)}</span>
                                    {trip.passengers && (
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3 shrink-0" />
                                            {trip.passengers.adults ?? 1} adult{(trip.passengers.adults ?? 1) !== 1 ? 's' : ''}
                                            {trip.passengers.children ? `, ${trip.passengers.children} child${trip.passengers.children !== 1 ? 'ren' : ''}` : ''}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Step 2 — Availability (only shown when trip context exists) */}
                            {(hasTrip || mktLegId) && (
                            <div className="bg-background rounded-xl border shadow-xs p-4 space-y-4">
                                {!hasTrip && (
                                    <p className="text-sm font-semibold flex items-center gap-1.5">
                                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
                                        Available dates
                                    </p>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
                                        <input
                                            type="date"
                                            value={checkFrom}
                                            onChange={e => { setCheckFrom(e.target.value); setHasChecked(false); setSelectedSlotDate(null); setSelectedTime(null); }}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
                                        <input
                                            type="date"
                                            value={checkTo}
                                            min={checkFrom}
                                            onChange={e => { setCheckTo(e.target.value); setHasChecked(false); setSelectedSlotDate(null); setSelectedTime(null); }}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adults</label>
                                        <div className="flex items-center gap-3">
                                            <Button variant={attractionAdults > 1 ? 'default' : 'outline'} size="icon" className="h-8 w-8 rounded-full"
                                                onClick={() => setAttractionAdults(n => Math.max(1, n - 1))} disabled={attractionAdults <= 1}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-6 text-center font-semibold text-base">{attractionAdults}</span>
                                            <Button variant="default" size="icon" className="h-8 w-8 rounded-full"
                                                onClick={() => setAttractionAdults(n => Math.min(10, n + 1))}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            {s.price > 0 && (
                                                <span className="text-xs text-muted-foreground ml-1">× {fmtPrice(s.price, s.currency)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => { setHasChecked(true); setSelectedSlotDate(null); setSelectedTime(null); }}
                                        disabled={availInFlight}
                                        variant={hasChecked ? 'outline' : 'default'}
                                        size={hasChecked ? 'sm' : 'default'}
                                        className="gap-2"
                                    >
                                        {availInFlight ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : hasChecked ? <><RefreshCw className="h-3.5 w-3.5" /> Refresh</> : <><CalendarIcon className="h-4 w-4" /> Check Availability</>}
                                    </Button>
                                </div>
                            </div>
                            )}

                            {/* Results — only shown after user clicks Check Availability */}
                            {hasChecked && !availInFlight && (
                                <>
                                    {/* Open voucher */}
                                    {isOpenVoucher && (
                                        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3 text-sm text-green-800">
                                            <Check className="h-4 w-4 shrink-0 text-green-600" />
                                            <div>
                                                <p className="font-semibold">Open voucher</p>
                                                <p className="opacity-80 text-xs mt-0.5">Valid any day during your trip — no time slot required.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Date slot cards */}
                                    {!availFailed && !isOpenVoucher && slots.length > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">
                                                Available dates — select one
                                            </p>
                                            <div className="flex gap-2 flex-wrap">
                                                {slots.map(slot => {
                                                    const isSelected = selectedSlotDate === slot.date;
                                                    return (
                                                        <button key={slot.date}
                                                            onClick={() => { setSelectedSlotDate(slot.date); setSelectedTime(null); }}
                                                            className={`rounded-xl border px-3 py-2 text-left transition-all min-w-[90px] ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'bg-background border-border hover:border-primary/50 hover:bg-muted/30'}`}
                                                        >
                                                            <div className="text-xs font-bold text-foreground">{formatSlotDate(slot.date)}</div>
                                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                                {slot.times?.length ? `${slot.times.length} time${slot.times.length !== 1 ? 's' : ''}` : 'All day'}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Time selection — shown below date cards */}
                                            {selectedSlotDate && slotTimes.length > 0 && (
                                                <div className="mt-4 rounded-xl border bg-background p-3 space-y-2">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" /> Select a time for {formatSlotDate(selectedSlotDate)}
                                                    </p>
                                                    <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                                                        {slotTimes.map(t => (
                                                            <button
                                                                key={t}
                                                                onClick={() => setSelectedTime(t)}
                                                                className={`shrink-0 snap-start rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                                                                    selectedTime === t
                                                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                                        : 'bg-muted/30 border-border hover:border-primary/50 hover:bg-muted/60'
                                                                }`}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {!selectedTime && (
                                                        <p className="text-xs text-amber-600">Pick a time to continue</p>
                                                    )}
                                                </div>
                                            )}
                                            {selectedSlotDate && slotTimes.length === 0 && (
                                                <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                                                    <Check className="h-4 w-4 shrink-0" />{formatSlotDate(selectedSlotDate)} — available all day
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Fallback date picker (sandbox: no slot data) */}
                                    {availFailed && (
                                        <div className="space-y-2">
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                Live availability unavailable
                                                {(availError as any)?.status ? ` (${(availError as any).status})` : ''}.
                                                {(availError as any)?.body?.detail && (
                                                    <span className="block mt-0.5 opacity-75">
                                                        {typeof (availError as any).body.detail === 'string'
                                                            ? (availError as any).body.detail
                                                            : JSON.stringify((availError as any).body.detail)}
                                                    </span>
                                                )}
                                                Pick a date manually to continue.
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose your date</label>
                                                <input type="date" value={selectedSlotDate ?? ''} min={checkFrom} max={checkTo}
                                                    onChange={e => setSelectedSlotDate(e.target.value || null)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* No slots returned */}
                                    {!availFailed && !isOpenVoucher && slots.length === 0 && !availUuid && (
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                            Availability ID missing for this product.
                                        </div>
                                    )}
                                    {!availFailed && !isOpenVoucher && slots.length === 0 && !!availUuid && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                            No availability found for these dates. Try a different range.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </div>
                </div>{/* end scrollable */}

                {/* Footer — shrink-0 keeps it pinned below the scroll area */}
                <div className="shrink-0 border-t bg-background/90 backdrop-blur-md">
                    <div className="flex justify-between items-center gap-4 p-4">
                        <div>
                            {isHotel && selectedRoomId ? (
                                <>
                                    <span className="text-sm text-muted-foreground">Total price</span>
                                    <div className="text-2xl font-bold flex items-center gap-1">
                                        {fmtPrice(totalPrice, service.currency)}
                                    </div>
                                </>
                            ) : !isHotel && totalPrice > 0 ? (
                                <>
                                    <span className="text-sm text-muted-foreground">
                                        Total · {attractionAdults} guest{attractionAdults !== 1 ? 's' : ''}
                                        {selectedSlotDate && ` · ${formatSlotDate(selectedSlotDate)}`}
                                        {selectedTime && ` at ${selectedTime}`}
                                    </span>
                                    <div className="text-2xl font-bold flex items-center gap-1">
                                        {fmtPrice(totalPrice, service.currency)}
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm font-medium text-muted-foreground">
                                    {isHotel ? 'Select a room to see pricing' : `From ${fmtPrice(s.price, s.currency)}`}
                                </div>
                            )}
                        </div>
                        {(hasTrip || mktReady) && (
                            <Button
                                size="lg"
                                className="flex-1 max-w-[200px]"
                                disabled={!canAdd || isAdding}
                                onClick={handleAdd}
                            >
                                {isAdding ? 'Adding…' : 'Add to Trip'}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
