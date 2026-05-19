'use client';

import { useState } from 'react';
import { TripDay, Hotel, Attraction, TripLegData } from '@/lib/mock-data';
import { ItineraryDay } from './ItineraryDay';
import { cn } from '@/lib/utils';
import { MapPin, BedDouble, Car, Pencil, Save, X, Trash2, ShieldCheck, ShoppingBag, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatShortDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTrips } from '@/context/TripContext';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import { HotelBookingSidebar } from './HotelBookingSidebar';

interface TripLegProps {
    leg: TripLegData;
    tripId: string;
    onOpenMarketplace?: (tab?: string) => void;
    onOpenServiceDetails?: (service: any, type: 'Hotel' | 'Attraction') => void;
    onDelete?: () => void;
}

export function TripLeg({ leg, tripId, onOpenMarketplace, onOpenServiceDetails, onDelete }: TripLegProps) {
    const { getTripById, updateTrip, moveActivity, removeHotel, removeTransfer, updateItemBookingStatus, dismissRecommendation, dismissRecommendations } = useTrips();
    const trip = getTripById(tripId);
    const { title, location, hotels = [], arrivalTransfer, days } = leg;

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const [editedLocation, setEditedLocation] = useState(location);
    const [editedStartDate, setEditedStartDate] = useState(leg.startDate.split('T')[0]);
    const [editedEndDate, setEditedEndDate] = useState(leg.endDate.split('T')[0]);

    // Manual Add Hotel State
    const [isAddHotelOpen, setIsAddHotelOpen] = useState(false);
    const [manualHotelId, setManualHotelId] = useState<string | null>(null);
    const [manualHotelName, setManualHotelName] = useState('');
    const [manualCheckIn, setManualCheckIn] = useState(leg.startDate.split('T')[0]);
    const [manualCheckOut, setManualCheckOut] = useState(leg.endDate.split('T')[0]);
    const [manualPrice, setManualPrice] = useState('0');

    // Booked Hotel Sidebar State
    const [selectedBookedHotelIdx, setSelectedBookedHotelIdx] = useState<number | null>(null);
    const [isBookedHotelSidebarOpen, setIsBookedHotelSidebarOpen] = useState(false);

    const openAddManualHotel = () => {
        setManualHotelId(null);
        setManualHotelName('');
        setManualCheckIn(leg.startDate.split('T')[0]);
        setManualCheckOut(leg.endDate.split('T')[0]);
        setManualPrice('0');
        setIsAddHotelOpen(true);
    };

    const openEditManualHotel = (h: any) => {
        setManualHotelId(h.hotel.id);
        setManualHotelName(h.hotel.name);
        setManualCheckIn(h.checkIn.split('T')[0]);
        setManualCheckOut(h.checkOut.split('T')[0]);
        setManualPrice((h.hotel.price || 0).toString());
        setIsAddHotelOpen(true);
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) {
            return;
        }

        const sourceDayIndex = parseInt(source.droppableId);
        const destDayIndex = parseInt(destination.droppableId);

        if (sourceDayIndex === destDayIndex && source.index === destination.index) {
            return;
        }

        moveActivity(tripId, leg.id, sourceDayIndex, destDayIndex, source.index, destination.index);
    };

    const handleSave = () => {
        const trip = getTripById(tripId);
        if (trip) {
            const updatedLegs = trip.legs.map(l => {
                if (l.id === leg.id) {
                    const addDays = (s: string, n: number) => { const [y,m,d] = s.split('-').map(Number); const ms = Date.UTC(y,m-1,d)+n*86400000; const dt=new Date(ms); return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`; };
                    const newDays = [];
                    for (let cur = editedStartDate; cur <= editedEndDate; cur = addDays(cur, 1)) {
                        const existingDay = l.days?.find(day => day.date.slice(0, 10) === cur);
                        newDays.push(existingDay ? { ...existingDay, date: cur } : { date: cur, location: editedLocation, activities: [] });
                    }

                    return {
                        ...l,
                        title: editedTitle,
                        location: editedLocation,
                        startDate: editedStartDate,
                        endDate: editedEndDate,
                        days: newDays
                    };
                }
                return l;
            });
            updateTrip({ ...trip, legs: updatedLegs });
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedTitle(title);
        setEditedLocation(location);
        setEditedStartDate(leg.startDate.split('T')[0]);
        setEditedEndDate(leg.endDate.split('T')[0]);
        setIsEditing(false);
    };

    const isEmptyLeg = hotels.length === 0 && !arrivalTransfer && days.every(d => d.activities.length === 0);

    const handleSaveManualHotel = () => {
        if (!manualHotelName) return;

        const trip = getTripById(tripId);
        if (trip) {
            const updatedLegs = trip.legs.map(l => {
                if (l.id === leg.id) {
                    const hotelEntry = {
                        hotel: {
                            id: manualHotelId || `manual-hotel-${Date.now()}`,
                            name: manualHotelName,
                            category: 'Hotel',
                            rating: 0,
                            reviews: [],
                            price: parseFloat(manualPrice) || 0,
                            currency: 'USD',
                            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
                            description: 'Manually added hotel.',
                            location: l.location,
                            amenities: [],
                            bookingStatus: 'booked_manual'
                        } as Hotel,
                        checkIn: `${manualCheckIn}T15:00:00Z`,
                        checkOut: `${manualCheckOut}T11:00:00Z`
                    };

                    if (manualHotelId) {
                        return { ...l, hotels: l.hotels?.map(h => h.hotel.id === manualHotelId ? hotelEntry : h) || [] };
                    } else {
                        return { ...l, hotels: [...(l.hotels || []), hotelEntry] };
                    }
                }
                return l;
            });
            updateTrip({ ...trip, legs: updatedLegs });
        }
        setIsAddHotelOpen(false);
        setManualHotelId(null);
        setManualHotelName('');
        setManualPrice('0');
    };

    return (
        <div className="mb-8 last:mb-0">
            {/* Leg Header */}
            <div className="flex items-start gap-3 mb-6 relative group">
                <div className="bg-primary/10 text-primary p-2.5 rounded-full mt-1">
                    <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    {isEditing ? (
                        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Leg Title</label>
                                    <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="font-semibold" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Destination</label>
                                    <Input value={editedLocation} onChange={(e) => setEditedLocation(e.target.value)} className="font-semibold" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                                    <Input type="date" value={editedStartDate} onChange={(e) => setEditedStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                                    <Input type="date" value={editedEndDate} onChange={(e) => setEditedEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <div>
                                    {onDelete && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (!isEmptyLeg) {
                                                    alert("Cannot delete a leg that contains hotels, transfers, or activities. Please remove them first.");
                                                    return;
                                                }
                                                onDelete();
                                            }}
                                            className={cn("bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 border-red-200 transition-opacity", !isEmptyLeg && "opacity-50 cursor-not-allowed")}
                                            title={!isEmptyLeg ? "Leg must be empty to delete" : "Delete Leg"}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" /> Delete Leg
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                                        <X className="h-4 w-4 mr-1" /> Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSave}>
                                        <Save className="h-4 w-4 mr-1" /> Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-semibold">{title} - {location}</h3>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    {onDelete && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-8 w-8", !isEmptyLeg ? "text-muted-foreground/30 cursor-not-allowed" : "text-destructive hover:bg-destructive/10")}
                                            onClick={() => {
                                                if (!isEmptyLeg) {
                                                    alert("Cannot delete a leg that contains hotels, transfers, or activities. Please remove them first.");
                                                    return;
                                                }
                                                if (confirm("Are you sure you want to delete this trip leg?")) {
                                                    onDelete();
                                                }
                                            }}
                                            title={!isEmptyLeg ? "Leg must be empty to delete" : "Delete Leg"}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                                {formatShortDate(leg.startDate)}
                                <span className="text-border">→</span>
                                {formatShortDate(leg.endDate)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="ml-6 pl-8 border-l-2 border-muted space-y-8 pb-4">
                {/* Arrival Transfer Section (Optional top level) */}
                <div className="grid gap-4 md:grid-cols-1 mb-8">
                    {hotels.length > 0 ? (
                        <div className="rounded-xl border bg-slate-50 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BedDouble className="h-4 w-4" /> Accommodation Summary</h4>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={openAddManualHotel} className="h-8 text-xs">
                                        Add Manually
                                    </Button>
                                    <Link href={`/trip/${tripId}/explore?category=hotels`}>
                                        <Button size="sm" className="h-8">
                                            Book Hotel
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {hotels.map((h, idx) => {
                                    const nights = Math.ceil((new Date(h.checkOut).getTime() - new Date(h.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                                    const total = h.hotel.price * (nights > 0 ? nights : 1);
                                    const isPurchased = h.hotel.bookingStatus === 'booked';
                                    const isBookedManual = h.hotel.bookingStatus === 'booked_manual';
                                    const isAnyBooked = isPurchased || isBookedManual;
                                    return (
                                        <div key={idx} className={cn("bg-background rounded border p-3 group relative transition-colors cursor-pointer hover:shadow-sm")} onClick={() => {
                                            if (isPurchased) {
                                                setSelectedBookedHotelIdx(idx);
                                                setIsBookedHotelSidebarOpen(true);
                                            } else if (h.hotel.id.startsWith('manual-')) {
                                                openEditManualHotel(h);
                                            } else if (onOpenServiceDetails) {
                                                onOpenServiceDetails(h.hotel, 'Hotel');
                                            }
                                        }}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-sm">{h.hotel.name}</p>
                                                        {isPurchased ? (
                                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 ml-1 gap-1 px-1.5 py-0 border-transparent">
                                                                <ShieldCheck className="h-3 w-3" /> Purchased
                                                            </Badge>
                                                        ) : isBookedManual ? (
                                                            <Badge variant="outline" className="text-green-700 border-green-600 bg-green-50 ml-1 gap-1 px-1.5 py-0">
                                                                <CheckCircle2 className="h-3 w-3" /> Booked
                                                            </Badge>
                                                        ) : h.hotel.bookingStatus === 'planned' ? (
                                                            <Badge variant="secondary" className="ml-1 gap-1 text-blue-700 bg-blue-100/50 px-1.5 py-0">
                                                                <ShoppingBag className="h-3 w-3" /> In Cart
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{formatShortDate(h.checkIn)} - {formatShortDate(h.checkOut)}</p>
                                                    <p className="text-xs font-semibold mt-1">{total} {h.hotel.currency} total</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isPurchased ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-green-600 cursor-default hover:text-green-600"
                                                            title="Purchased"
                                                        >
                                                            <ShieldCheck className="h-4 w-4" />
                                                        </Button>
                                                    ) : isBookedManual ? (
                                                        <>
                                                            {!h.hotel.id.startsWith('manual-') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                                                                    title="Move to Cart"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateItemBookingStatus(tripId, leg.id, 'Hotel', 'planned', idx);
                                                                    }}
                                                                >
                                                                    <ShoppingBag className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                                title="Remove"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeHotel(tripId, leg.id, idx);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-green-600"
                                                                title="Mark as Booked"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateItemBookingStatus(tripId, leg.id, 'Hotel', 'booked_manual', idx);
                                                                }}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                                title="Remove"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeHotel(tripId, leg.id, idx);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed p-4 flex items-center justify-between bg-slate-50/50">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BedDouble className="h-4 w-4" /> No Accommodation</h4>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={openAddManualHotel} className="h-8 text-xs">
                                    Add Manually
                                </Button>
                                <Link href={`/trip/${tripId}/explore?category=hotels`}>
                                    <Button size="sm" className="h-8">
                                        Book Hotel
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}


                    <div className="rounded-xl border bg-slate-50 p-4 mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" /> Arrival Transfer</h4>
                            {!arrivalTransfer && (
                                <Link href={`/trip/${tripId}/explore?category=transport`}>
                                    <Button variant="outline" size="sm" className="h-8">
                                        + Book Transfer
                                    </Button>
                                </Link>
                            )}
                        </div>
                        {arrivalTransfer ? (
                            <div className="grid grid-cols-1 gap-3">
                                {(() => {
                                    const isPurchased = arrivalTransfer.bookingStatus === 'booked';
                                    const isBookedManual = arrivalTransfer.bookingStatus === 'booked_manual';
                                    const isAnyBooked = isPurchased || isBookedManual;
                                    return (
                                        <div
                                            className={cn("bg-background rounded border p-3 group relative transition-colors", isAnyBooked ? "cursor-default opacity-95" : "cursor-pointer hover:shadow-sm")}
                                            onClick={() => {
                                                if (!arrivalTransfer.id.startsWith('manual-') && onOpenServiceDetails) {
                                                    onOpenServiceDetails(arrivalTransfer, 'Attraction');
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-sm">{arrivalTransfer.name}</p>
                                                        {isPurchased ? (
                                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 ml-1 gap-1 px-1.5 py-0 border-transparent">
                                                                <ShieldCheck className="h-3 w-3" /> Purchased
                                                            </Badge>
                                                        ) : isBookedManual ? (
                                                            <Badge variant="outline" className="text-green-700 border-green-600 bg-green-50 ml-1 gap-1 px-1.5 py-0">
                                                                <CheckCircle2 className="h-3 w-3" /> Booked
                                                            </Badge>
                                                        ) : arrivalTransfer.bookingStatus === 'planned' ? (
                                                            <Badge variant="secondary" className="ml-1 gap-1 text-blue-700 bg-blue-100/50 px-1.5 py-0">
                                                                <ShoppingBag className="h-3 w-3" /> In Cart
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{arrivalTransfer.duration} • {arrivalTransfer.rating}★</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isPurchased ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-green-600 cursor-default hover:text-green-600"
                                                            title="Purchased"
                                                        >
                                                            <ShieldCheck className="h-4 w-4" />
                                                        </Button>
                                                    ) : isBookedManual ? (
                                                        <>
                                                            {!arrivalTransfer.id.startsWith('manual-') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                                                                    title="Move to Cart"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateItemBookingStatus(tripId, leg.id, 'Transfer', 'planned');
                                                                    }}
                                                                >
                                                                    <ShoppingBag className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                                title="Remove"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeTransfer(tripId, leg.id);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-green-600"
                                                                title="Mark as Booked"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateItemBookingStatus(tripId, leg.id, 'Transfer', 'booked_manual');
                                                                }}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                                title="Remove"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeTransfer(tripId, leg.id);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No arrival transfer booked.</p>
                        )}
                    </div>
                </div>

                {/* Days */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="space-y-0 relative">
                        {days.length > 0 ? days.map((day, index) => {
                            const checkIns = hotels.filter(h => h.checkIn.split('T')[0] === day.date.split('T')[0]);
                            const checkOuts = hotels.filter(h => h.checkOut.split('T')[0] === day.date.split('T')[0]);

                            return (
                                <div key={index} className="relative pb-8 last:pb-0">
                                    <div className="absolute left-[-41px] top-0 h-3 w-3 rounded-full bg-muted-foreground ring-4 ring-background" />

                                    <ItineraryDay
                                        day={day}
                                        tripId={tripId}
                                        index={index}
                                        legId={leg.id}
                                        checkIns={checkIns}
                                        checkOuts={checkOuts}
                                        onOpenServiceDetails={onOpenServiceDetails}
                                    />
                                </div>
                            );
                        }) : (
                            <div className="py-4 text-center text-sm text-muted-foreground italic">
                                No itinerary planned for this leg yet.
                            </div>
                        )}
                    </div>
                </DragDropContext>
            </div>

            {/* Manual Hotel Modal */}
            <Dialog open={isAddHotelOpen} onOpenChange={setIsAddHotelOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{manualHotelId ? 'Edit' : 'Add'} Accommodation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="hotelName">Hotel Name</Label>
                            <Input id="hotelName" placeholder="e.g. The Ritz-Carlton" value={manualHotelName} onChange={e => setManualHotelName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Check-in</Label>
                                <Input type="date" value={manualCheckIn} onChange={e => setManualCheckIn(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Check-out</Label>
                                <Input type="date" value={manualCheckOut} onChange={e => setManualCheckOut(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hotelPrice">Price per night (Optional)</Label>
                            <Input id="hotelPrice" type="number" placeholder="0" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveManualHotel} disabled={!manualHotelName}>{manualHotelId ? 'Save Changes' : 'Add Hotel'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
