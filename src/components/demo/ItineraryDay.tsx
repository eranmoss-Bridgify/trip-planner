import { TripDay, Attraction, Hotel, ATTRACTIONS } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Hotel as HotelIcon, Camera, Bus, MapPin, Clock, MoreHorizontal, BedDouble, ShieldCheck, ShoppingBag, CheckCircle2, Trash2, GripVertical, Calendar, AlertCircle } from 'lucide-react';
import { cn, formatShortDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { useTrips } from '@/context/TripContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecommendationCarousel } from './RecommendationCarousel';
import { Sparkles } from 'lucide-react';

interface ItineraryDayProps {
    day: TripDay;
    tripId: string;
    index: number;
    legId: string;
    checkIns?: { hotel: Hotel; checkIn: string; checkOut: string }[];
    checkOuts?: { hotel: Hotel; checkIn: string; checkOut: string }[];
    onOpenServiceDetails?: (service: Hotel | Attraction, type: 'Hotel' | 'Attraction') => void;
}

export function ItineraryDay({ day, tripId, index, legId, checkIns, checkOuts, onOpenServiceDetails }: ItineraryDayProps) {
    const { trips, moveActivityToLeg, removeActivity, updateItemBookingStatus, dismissRecommendation, dismissRecommendations, addServiceToLeg } = useTrips();
    const trip = trips.find(t => t.id === tripId);

    // Pick 4 suggestions based on day index, filter out dismissed ones
    const daySuggestions = ATTRACTIONS.filter((a: Attraction) => a.category === 'Attraction' || a.category === 'Tour')
        .slice((index * 4) % ATTRACTIONS.length, ((index * 4) + 4) % ATTRACTIONS.length || ATTRACTIONS.length)
        .filter((s: Attraction) => !trip?.dismissedRecommendations?.includes(s.id));

    const handleSurpriseMe = () => {
        const availableAttractions = ATTRACTIONS.filter((a: Attraction) =>
            (a.category === 'Attraction' || a.category === 'Tour') &&
            !day.activities.some(da => da.id.replace(/-[0-9]+-[0-9]+$/, '') === a.id) // Avoid immediate duplicates
        );
        if (availableAttractions.length === 0) return;

        const randomAttraction = availableAttractions[Math.floor(Math.random() * availableAttractions.length)];

        if (onOpenServiceDetails) {
            onOpenServiceDetails({ ...randomAttraction, date: day.date }, 'Attraction');
        }
    };

    return (
        <div className="pl-4 sm:pl-0">
            {/* Dot/Line handled by parent for grouping */}

            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Day {index + 1} - {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 border-indigo-200 border"
                        onClick={handleSurpriseMe}
                    >
                        <Sparkles className="h-4 w-4" /> Surprise Me
                    </Button>
                    <Link href={`/trip/${tripId}/explore?date=${day.date}`}>
                        <Button size="sm" variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" /> Add Activity
                        </Button>
                    </Link>
                </div>
            </div>

            {checkOuts && checkOuts.length > 0 && checkOuts.map((h, i) => (
                <div key={`out-${i}`} className="mb-4">
                    <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => onOpenServiceDetails && onOpenServiceDetails(h.hotel, 'Hotel')}>
                        <div className="flex items-center gap-3 text-orange-700">
                            <div className="p-1.5 bg-orange-100 rounded-md"><BedDouble className="h-4 w-4" /></div>
                            <div>
                                <p className="text-sm font-semibold">Check-out: {h.hotel.name}</p>
                                <p className="text-xs opacity-80">By 11:00</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-orange-700 hover:text-orange-800 hover:bg-orange-100">Details</Button>
                    </div>

                    {/* Departure Transfer Hook */}
                    <Link href={`/trip/${tripId}/explore?category=transport`}>
                        <Button variant="ghost" size="sm" className="w-full mt-2 border border-dashed text-muted-foreground gap-2">
                            <Bus className="h-3 w-3" /> Book Departure Transfer
                        </Button>
                    </Link>
                </div>
            ))}

            {checkIns && checkIns.length > 0 && checkIns.map((h, i) => (
                <div key={`in-${i}`} className="mb-4 bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => onOpenServiceDetails && onOpenServiceDetails(h.hotel, 'Hotel')}>
                    <div className="flex items-center gap-3 text-blue-700">
                        <div className="p-1.5 bg-blue-100 rounded-md"><BedDouble className="h-4 w-4" /></div>
                        <div>
                            <p className="text-sm font-semibold">Check-in: {h.hotel.name}</p>
                            <p className="text-xs opacity-80">From 15:00</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-blue-700 hover:text-blue-800 hover:bg-blue-100">Details</Button>
                </div>
            ))}

            <Droppable droppableId={index.toString()}>
                {(provided: any) => (
                    <div
                        className="space-y-4 min-h-[100px]"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {day.activities.length === 0 ? (
                            <div className="p-6 border border-dashed rounded-xl bg-muted/10 flex flex-col items-center justify-center text-center gap-2">
                                <p className="text-muted-foreground text-sm">No activities planned for this day.</p>
                                <Link href={`/trip/${tripId}/explore?date=${day.date}`}>
                                    <Button variant="link" className="text-primary">Explore recommendations</Button>
                                </Link>
                            </div>
                        ) : (
                            day.activities.map((activity, i) => {
                                const isPurchased = activity.bookingStatus === 'booked';
                                const isBookedManual = activity.bookingStatus === 'booked_manual';
                                const isAnyBooked = isPurchased || isBookedManual;
                                return (
                                    <Draggable key={activity.id} draggableId={activity.id} index={i}>
                                        {(provided: any) => (
                                            <Card
                                                className={cn("flex flex-row overflow-hidden bg-background transition-shadow", isAnyBooked ? "opacity-95" : "hover:shadow-md")}
                                                onClick={() => {
                                                    if (!activity.id.startsWith('manual-') && onOpenServiceDetails) {
                                                        onOpenServiceDetails(activity, (activity as Attraction).category ? 'Attraction' : 'Hotel');
                                                    }
                                                }}
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                style={{ ...provided.draggableProps.style }}
                                            >
                                                {/* Drag Handle */}
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="flex items-center justify-center px-1.5 bg-muted/20 hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing border-r shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <GripVertical className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
                                                </div>

                                                {/* Thumbnail */}
                                                <div className="w-20 shrink-0 bg-muted">
                                                    <img src={activity.image} alt={activity.name} className="w-full h-full object-cover" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">

                                                    {/* Row 1: Status badge + menu */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            {isPurchased ? (
                                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1 px-1.5 py-0 text-[10px] border-transparent">
                                                                    <ShieldCheck className="h-2.5 w-2.5" /> Purchased
                                                                </Badge>
                                                            ) : isBookedManual ? (
                                                                <Badge variant="outline" className="text-green-700 border-green-600 bg-green-50 gap-1 px-1.5 py-0 text-[10px]">
                                                                    <CheckCircle2 className="h-2.5 w-2.5" /> Booked
                                                                </Badge>
                                                            ) : activity.bookingStatus === 'planned' ? (
                                                                <Badge variant="secondary" className="gap-1 text-blue-700 bg-blue-100/50 px-1.5 py-0 text-[10px]">
                                                                    <ShoppingBag className="h-2.5 w-2.5" /> In Cart
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                {trips.find(t => t.id === tripId)?.legs.filter(l => l.id !== legId).length ? (
                                                                    <>
                                                                        {trips.find(t => t.id === tripId)?.legs.filter(l => l.id !== legId).map(otherLeg => (
                                                                            <DropdownMenuItem
                                                                                key={otherLeg.id}
                                                                                onClick={(e) => { e.stopPropagation(); moveActivityToLeg(tripId, legId, otherLeg.id, index, i); }}
                                                                            >
                                                                                Move to {otherLeg.title}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </>
                                                                ) : (
                                                                    <DropdownMenuItem disabled>No other legs</DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                {isPurchased ? (
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                                                        <ShieldCheck className="mr-2 h-4 w-4" /> Manage Purchase
                                                                    </DropdownMenuItem>
                                                                ) : isBookedManual ? (
                                                                    <>
                                                                        {!activity.id.startsWith('manual-') && (
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => { e.stopPropagation(); updateItemBookingStatus(tripId, legId, 'Attraction', 'planned', undefined, index, i); }}
                                                                            >
                                                                                <ShoppingBag className="mr-2 h-4 w-4" /> Move to Cart
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        <DropdownMenuItem
                                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                            onClick={(e) => { e.stopPropagation(); removeActivity(tripId, legId, index, i); }}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Remove from Leg
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                                                            onClick={(e) => { e.stopPropagation(); updateItemBookingStatus(tripId, legId, 'Attraction', 'booked_manual', undefined, index, i); }}
                                                                        >
                                                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Booked
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                            onClick={(e) => { e.stopPropagation(); removeActivity(tripId, legId, index, i); }}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Remove from Leg
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {/* Row 2: Title */}
                                                    <h4 className="font-semibold text-sm leading-tight truncate">{activity.name}</h4>

                                                    {/* Row 3: Category + Duration */}
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        {(activity as Attraction).category ? <Camera className="h-3 w-3 shrink-0" /> : <HotelIcon className="h-3 w-3 shrink-0" />}
                                                        <span>{(activity as Attraction).category || 'Hotel'}</span>
                                                        {(activity as Attraction).duration && (
                                                            <>
                                                                <span className="text-border">•</span>
                                                                <Clock className="h-3 w-3 shrink-0" />
                                                                <span>{(activity as Attraction).duration}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Row 4: Date (always shows booking date; warns if dragged to wrong day) */}
                                                    {(activity as any).date && (() => {
                                                        const bookedDate = (activity as any).date as string;
                                                        const isMismatch = bookedDate.split('T')[0] !== day.date.split('T')[0];
                                                        return (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <div className={cn("flex items-center gap-1", isMismatch ? "text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200" : "")} title={isMismatch ? "Booking date doesn't match this day" : ""}>
                                                                    <Calendar className="h-3 w-3 shrink-0" />
                                                                    <span>{formatShortDate(bookedDate)}</span>
                                                                    {isMismatch && <AlertCircle className="h-3 w-3 text-red-600" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Row 5: Passengers / Tickets */}
                                                    {(() => {
                                                        const trip = trips.find(t => t.id === tripId);
                                                        const adults = trip?.passengers?.adults ?? 1;
                                                        const children = trip?.passengers?.children ?? 0;
                                                        const perPax = activity.price * adults + activity.price * 0.7 * children;
                                                        return (
                                                            <div className="flex items-center justify-between pt-1 border-t border-muted mt-1">
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span>{adults} Adult{adults !== 1 ? 's' : ''}</span>
                                                                    {children > 0 && <><span className="text-border">•</span><span>{children} Child{children !== 1 ? 'ren' : ''}</span></>}
                                                                </div>
                                                                <span className="font-bold text-sm">{Math.round(perPax)} {activity.currency}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </Card>
                                        )}
                                    </Draggable>
                                );
                            })
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {/* Daily Activity Recommendations - Only on first leg */}
            {trips.find(t => t.id === tripId)?.legs[0].id === legId && daySuggestions.length > 0 && (
                <div className="mt-2">
                    <RecommendationCarousel
                        title={`Recommended for Day ${index + 1}`}
                        items={daySuggestions}
                        onDismiss={(id) => dismissRecommendation(tripId, id)}
                        onDismissAll={(ids) => dismissRecommendations(tripId, ids)}
                        onClick={(item) => onOpenServiceDetails && onOpenServiceDetails(item, 'Attraction')}
                    />
                </div>
            )}
        </div>
    );
}
