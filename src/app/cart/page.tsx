'use client';

import { useTrips } from '@/context/TripContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Clock, MapPin, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatShortDate } from '@/lib/utils';
import type { Attraction } from '@/types/services';

interface CartItem {
    tripId: string;
    tripName: string;
    legId: string;
    legName: string;
    dayIndex: number;
    activityIndex: number;
    activity: any;
    dayDate: string;
}

export default function CartPage() {
    const { trips, removeActivity } = useTrips();
    const router = useRouter();

    const cartItems: CartItem[] = [];
    for (const trip of trips) {
        for (const leg of trip.legs) {
            for (let di = 0; di < leg.days.length; di++) {
                const day = leg.days[di];
                for (let ai = 0; ai < day.activities.length; ai++) {
                    const act = day.activities[ai];
                    if (act.bookingStatus === 'planned') {
                        cartItems.push({
                            tripId: trip.id,
                            tripName: trip.name,
                            legId: leg.id,
                            legName: leg.title || leg.location,
                            dayIndex: di,
                            activityIndex: ai,
                            activity: act,
                            dayDate: day.date,
                        });
                    }
                }
            }
        }
    }

    const total = cartItems.reduce((sum, item) => sum + (item.activity.price ?? 0), 0);
    const currency = cartItems[0]?.activity.currency ?? 'USD';

    if (cartItems.length === 0) {
        return (
            <div className="container px-4 md:px-6 py-16 max-w-2xl mx-auto text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold">Your cart is empty</h1>
                <p className="text-muted-foreground">Add experiences from your trip itinerary to get started.</p>
                <Button asChild className="gap-2">
                    <Link href="/marketplace"><ShoppingBag className="h-4 w-4" /> Browse Experiences</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container px-4 md:px-6 py-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6" /> Cart
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">{cartItems.length} experience{cartItems.length !== 1 ? 's' : ''} · each purchased separately</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{Math.round(total)} {currency}</p>
                </div>
            </div>

            <div className="space-y-3">
                {cartItems.map((item, idx) => {
                    const act = item.activity as any;
                    const adults = trips.find(t => t.id === item.tripId)?.passengers?.adults ?? 1;
                    const children = trips.find(t => t.id === item.tripId)?.passengers?.children ?? 0;
                    const perPax = (act.price ?? 0) * adults + (act.price ?? 0) * 0.7 * children;

                    return (
                        <Card key={`${item.activity.id}-${idx}`} className="flex flex-row overflow-hidden">
                            <div className="w-28 shrink-0 bg-muted relative">
                                {act.image && (
                                    <img src={act.image} alt={act.name} className="w-full h-full object-cover" />
                                )}
                                {act.isBestSeller && (
                                    <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                        ★ Best Seller
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 p-4 flex flex-col gap-1.5 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm leading-snug">{act.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                                                {(act as Attraction).category || 'Experience'}
                                            </Badge>
                                            {act.duration && (
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{act.duration}</span>
                                            )}
                                            {act.location && (
                                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{act.location}</span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeActivity(item.tripId, item.legId, item.dayIndex, item.activityIndex)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="text-foreground/60">{item.tripName}</span>
                                    <span>·</span>
                                    <span>{item.legName}</span>
                                    <span>·</span>
                                    <span>{formatShortDate(item.dayDate)}</span>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-muted mt-auto">
                                    <div className="text-xs text-muted-foreground">
                                        {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-sm">{Math.round(perPax)} {act.currency}</span>
                                        <Button
                                            size="sm"
                                            className="gap-1.5 h-8"
                                            onClick={() => {
                                                sessionStorage.setItem('wv_checkout_item', JSON.stringify(item));
                                                router.push(`/checkout/${encodeURIComponent(act.id)}`);
                                            }}
                                        >
                                            Buy Now <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
