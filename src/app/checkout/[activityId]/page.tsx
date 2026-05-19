'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTrips } from '@/context/TripContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2, AlertCircle, Clock, MapPin, Calendar,
    ChevronLeft, ChevronRight, Loader2, ShieldCheck, Star
} from 'lucide-react';
import { cn, formatShortDate } from '@/lib/utils';
import type { Attraction } from '@/types/services';

type Step = 'checking' | 'form' | 'review' | 'processing' | 'confirmed' | 'unavailable' | 'error';

interface CheckoutItem {
    tripId: string;
    tripName: string;
    legId: string;
    legName: string;
    dayIndex: number;
    activityIndex: number;
    activity: any;
    dayDate: string;
}

interface BookingForm {
    holder_name: string;
    email: string;
    phone: string;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { trips, confirmBooking } = useTrips();

    const [item, setItem] = useState<CheckoutItem | null>(null);
    const [step, setStep] = useState<Step>('checking');
    const [availableSlots, setAvailableSlots] = useState<{ date: string; times: string[] }[]>([]);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [form, setForm] = useState<BookingForm>({ holder_name: '', email: '', phone: '' });
    const [bookingRef, setBookingRef] = useState<string>('');
    const [confirmationCode, setConfirmationCode] = useState<string>('');
    const [isSandbox, setIsSandbox] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Load checkout item from sessionStorage
    useEffect(() => {
        const raw = sessionStorage.getItem('wv_checkout_item');
        if (!raw) { router.replace('/cart'); return; }
        const parsed: CheckoutItem = JSON.parse(raw);
        setItem(parsed);

        // Pre-fill form from trip passenger data
        const trip = trips.find(t => t.id === parsed.tripId);
        if (trip) {
            setForm(f => ({ ...f, holder_name: (trip as any).passengerName || '' }));
        }
    }, []);

    // Step 1: re-check availability as soon as item is loaded
    useEffect(() => {
        if (!item || step !== 'checking') return;

        const act = item.activity;
        const uuid = act.availabilityUuid;
        const availType = act.availabilityType;

        if (!uuid) {
            // No UUID — skip availability check, go straight to form
            setStep('form');
            return;
        }

        const date = item.dayDate;
        const params = new URLSearchParams({
            date_from: date,
            date_to: date,
            availability_type: availType ?? '',
        });

        fetch(`/api/bridgify/${encodeURIComponent(uuid)}/availability?${params}`)
            .then(r => r.json())
            .then(data => {
                const slots: { date: string; times: string[] }[] = data?.data?.slots ?? [];
                if (slots.length === 0 && availType === 'TSL') {
                    setStep('unavailable');
                    return;
                }
                setAvailableSlots(slots);
                if (slots.length > 0 && slots[0].times?.length > 0) {
                    setSelectedTime(slots[0].times[0]);
                }
                setStep('form');
            })
            .catch(() => setStep('form')); // On network error, don't block purchase
    }, [item, step]);

    const handleSubmit = async () => {
        if (!item) return;
        setStep('processing');

        const act = item.activity;
        const trip = trips.find(t => t.id === item.tripId);
        const adults = trip?.passengers?.adults ?? 1;

        try {
            const res = await fetch('/api/bridgify/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: act.availabilityUuid ?? act.id,
                    from_date: item.dayDate,
                    to_date: item.dayDate,
                    holder_name: form.holder_name,
                    email: form.email,
                    phone: form.phone,
                    adults,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error ?? 'Booking failed');
                setStep('error');
                return;
            }

            setBookingRef(data.booking_reference);
            setConfirmationCode(data.confirmation_code ?? '');
            setIsSandbox(!!data.sandbox);

            // Update trip context
            confirmBooking(item.tripId, item.legId, item.dayIndex, item.activityIndex, data.booking_reference);
            sessionStorage.removeItem('wv_checkout_item');

            setStep('confirmed');
        } catch (e) {
            setErrorMsg((e as Error).message);
            setStep('error');
        }
    };

    if (!item) return null;

    const act = item.activity as any;
    const trip = trips.find(t => t.id === item.tripId);
    const adults = trip?.passengers?.adults ?? 1;
    const children = trip?.passengers?.children ?? 0;
    const perPax = (act.price ?? 0) * adults + (act.price ?? 0) * 0.7 * children;
    const availType = act.availabilityType;
    const hasTimeSlots = availableSlots.some(s => s.times?.length > 0);

    return (
        <div className="container px-4 md:px-6 py-8 max-w-2xl mx-auto">
            {/* Back button */}
            {step !== 'confirmed' && step !== 'checking' && (
                <Button variant="ghost" size="sm" className="gap-1.5 mb-6 -ml-2 text-muted-foreground" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4" /> Back to cart
                </Button>
            )}

            {/* Step indicator */}
            {(step === 'form' || step === 'review' || step === 'processing') && (
                <div className="flex items-center gap-2 mb-8 text-sm">
                    {['Details', 'Review', 'Confirm'].map((label, i) => {
                        const stepIndex = step === 'form' ? 0 : step === 'review' ? 1 : 2;
                        return (
                            <div key={label} className="flex items-center gap-2">
                                <div className={cn(
                                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                                    i < stepIndex ? 'bg-primary text-primary-foreground' :
                                    i === stepIndex ? 'bg-primary text-primary-foreground' :
                                    'bg-muted text-muted-foreground'
                                )}>
                                    {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                <span className={i === stepIndex ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{label}</span>
                                {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* STEP: Checking availability */}
            {step === 'checking' && (
                <div className="text-center py-16 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <h2 className="text-xl font-semibold">Checking availability…</h2>
                    <p className="text-muted-foreground text-sm">Confirming this slot is still open</p>
                </div>
            )}

            {/* STEP: Unavailable */}
            {step === 'unavailable' && (
                <div className="text-center py-16 space-y-4">
                    <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
                    <h2 className="text-xl font-semibold">No availability on this date</h2>
                    <p className="text-muted-foreground text-sm">This slot has sold out. Try a different date in your itinerary.</p>
                    <Button onClick={() => router.back()}>Back to cart</Button>
                </div>
            )}

            {/* STEP: Booking form */}
            {step === 'form' && (
                <div className="space-y-6">
                    <h1 className="text-2xl font-bold">Your details</h1>

                    {/* Activity summary card */}
                    <ActivitySummaryCard act={act} dayDate={item.dayDate} />

                    {/* Time slot picker */}
                    {hasTimeSlots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Select a time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {availableSlots.flatMap(s => s.times).map(t => (
                                        <Button
                                            key={t}
                                            variant={selectedTime === t ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedTime(t)}
                                        >
                                            {t}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Traveller form */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Lead traveller</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="holder_name">Full name</Label>
                                <Input id="holder_name" placeholder="John Doe" value={form.holder_name} onChange={e => setForm(f => ({ ...f, holder_name: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Phone (optional)</Label>
                                <Input id="phone" type="tel" placeholder="+1 555 000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full gap-2"
                        disabled={!form.holder_name || !form.email}
                        onClick={() => setStep('review')}
                    >
                        Continue to review <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* STEP: Review */}
            {step === 'review' && (
                <div className="space-y-6">
                    <h1 className="text-2xl font-bold">Review your order</h1>

                    <ActivitySummaryCard act={act} dayDate={item.dayDate} selectedTime={selectedTime} />

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Traveller</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p className="font-medium">{form.holder_name}</p>
                            <p className="text-muted-foreground">{form.email}</p>
                            {form.phone && <p className="text-muted-foreground">{form.phone}</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Price breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span>{adults} adult{adults !== 1 ? 's' : ''} × {act.price} {act.currency}</span>
                                <span>{act.price * adults} {act.currency}</span>
                            </div>
                            {children > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>{children} child{children !== 1 ? 'ren' : ''} × {Math.round(act.price * 0.7)} {act.currency}</span>
                                    <span>{Math.round(act.price * 0.7 * children)} {act.currency}</span>
                                </div>
                            )}
                            {act.cancellationPolicy && (
                                <p className="text-xs text-muted-foreground pt-1">{act.cancellationPolicy}</p>
                            )}
                            <div className="flex justify-between font-bold text-base pt-2 border-t">
                                <span>Total</span>
                                <span>{Math.round(perPax)} {act.currency}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Edit details
                        </Button>
                        <Button className="flex-1 gap-2" onClick={handleSubmit}>
                            Confirm &amp; Pay <ShieldCheck className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP: Processing */}
            {step === 'processing' && (
                <div className="text-center py-16 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <h2 className="text-xl font-semibold">Processing your booking…</h2>
                </div>
            )}

            {/* STEP: Confirmed */}
            {step === 'confirmed' && (
                <div className="text-center py-12 space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-green-700">Booking confirmed!</h1>
                        {isSandbox && (
                            <p className="text-xs text-amber-600 mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded-full">Sandbox mode — no real charge made</p>
                        )}
                    </div>

                    <ActivitySummaryCard act={act} dayDate={item.dayDate} selectedTime={selectedTime} compact />

                    <Card className="text-left">
                        <CardContent className="pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Booking reference</span>
                                <span className="font-mono font-bold">{bookingRef}</span>
                            </div>
                            {confirmationCode && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Confirmation code</span>
                                    <span className="font-mono">{confirmationCode}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Name</span>
                                <span>{form.holder_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Email</span>
                                <span>{form.email}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" asChild>
                            <a href="/cart">Back to cart</a>
                        </Button>
                        <Button asChild>
                            <a href={`/trip/${item.tripId}`}>View itinerary</a>
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP: Error */}
            {step === 'error' && (
                <div className="text-center py-16 space-y-4">
                    <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
                    <h2 className="text-xl font-semibold">Something went wrong</h2>
                    <p className="text-muted-foreground text-sm">{errorMsg}</p>
                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => setStep('review')}>Try again</Button>
                        <Button variant="ghost" onClick={() => router.push('/cart')}>Back to cart</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActivitySummaryCard({
    act,
    dayDate,
    selectedTime,
    compact,
}: {
    act: any;
    dayDate: string;
    selectedTime?: string;
    compact?: boolean;
}) {
    return (
        <Card className={cn('overflow-hidden', compact ? '' : '')}>
            <div className="flex flex-row">
                {act.image && (
                    <div className="w-24 shrink-0 bg-muted relative">
                        <img src={act.image} alt={act.name} className="w-full h-full object-cover" />
                        {act.isBestSeller && (
                            <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star className="h-2 w-2 fill-white" /> Best Seller
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 p-4 space-y-1.5">
                    <h3 className="font-semibold text-sm leading-snug">{act.name}</h3>
                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {(act as Attraction).category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                                {(act as Attraction).category}
                            </Badge>
                        )}
                        {act.duration && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{act.duration}</span>
                        )}
                        {act.location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{act.location}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatShortDate(dayDate)}</span>
                        {selectedTime && <><span>·</span><span>{selectedTime}</span></>}
                    </div>
                    {act.cancellationPolicy && !compact && (
                        <p className="text-xs text-muted-foreground">{act.cancellationPolicy}</p>
                    )}
                </div>
            </div>
        </Card>
    );
}
