'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Trip } from '@/lib/mock-data';
import { fmtPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, ExternalLink, Loader2, Star, X } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const Calendar = dynamic(
    () => import('react-big-calendar').then(m => m.Calendar),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales: { 'en-US': enUS },
});

const CATEGORY_COLORS: Record<string, string> = {
    'Tour':        '#6366f1',
    'Museum':      '#8b5cf6',
    'Outdoor':     '#22c55e',
    'Food & Drink':'#f59e0b',
    'Nightlife':   '#ec4899',
    'Wellness':    '#14b8a6',
    'Workshop':    '#f97316',
    'Show':        '#ef4444',
    'Water Sport': '#0ea5e9',
    'Attraction':  '#3b82f6',
    'CityPass':    '#a855f7',
    'Transfer':    '#64748b',
    'Event':       '#d946ef',
    'ESim':        '#94a3b8',
};

function colorFor(cat: string) {
    return CATEGORY_COLORS[cat] ?? '#6366f1';
}

interface CalEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: {
        price: number;
        currency: string;
        category: string;
        duration: string;
        image: string;
        rating: number;
        supplierName?: string;
        color: string;
    };
}

interface TripCalendarViewProps {
    trip: Trip;
}

export function TripCalendarView({ trip }: TripCalendarViewProps) {
    const [selected, setSelected] = useState<CalEvent | null>(null);
    const [gcalLoading, setGcalLoading] = useState(false);
    const [gcalStatus, setGcalStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const { events, defaultDate } = useMemo(() => {
        const evts: CalEvent[] = [];
        let first: Date | null = null;

        for (const leg of trip.legs ?? []) {
            for (const day of leg.days ?? []) {
                const [y, m, d] = day.date.split('-').map(Number);
                let hourOffset = 9;

                for (const act of day.activities ?? []) {
                    const a = act as any;
                    const durationMins = a.durationMinutes ?? 60;
                    const start = new Date(y, m - 1, d, hourOffset, 0);
                    const end = addHours(start, Math.max(durationMins / 60, 0.5));
                    hourOffset += Math.max(durationMins / 60, 1) + 0.5;

                    evts.push({
                        id: a.id,
                        title: a.name,
                        start,
                        end,
                        resource: {
                            price: a.price ?? 0,
                            currency: a.currency ?? 'USD',
                            category: a.category ?? '',
                            duration: a.duration ?? '',
                            image: a.image ?? '',
                            rating: a.rating ?? 0,
                            supplierName: a.supplierName,
                            color: colorFor(a.category ?? ''),
                        },
                    });

                    if (!first) first = start;
                }
            }
        }

        return { events: evts, defaultDate: first ?? new Date() };
    }, [trip]);

    const eventStyleGetter = (event: CalEvent) => ({
        style: {
            backgroundColor: event.resource.color,
            border: selected?.id === event.id ? '2px solid white' : 'none',
            outline: selected?.id === event.id ? `2px solid ${event.resource.color}` : 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            padding: '2px 6px',
            cursor: 'pointer',
        },
    });

    const CustomEvent = ({ event }: { event: CalEvent }) => (
        <div className="overflow-hidden leading-tight">
            <div className="font-semibold truncate text-[11px]">{event.title}</div>
            {event.resource.price > 0 && (
                <div className="text-[10px] opacity-90">{fmtPrice(event.resource.price, event.resource.currency)}</div>
            )}
        </div>
    );

    const handleExportToGoogle = async () => {
        setGcalLoading(true);
        setGcalStatus('idle');
        try {
            const response = await fetch('/api/calendar/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripName: trip.destination,
                    events: events.map(e => ({
                        summary: e.title,
                        description: [
                            e.resource.category,
                            e.resource.price > 0 ? fmtPrice(e.resource.price, e.resource.currency) : '',
                            e.resource.duration,
                            e.resource.supplierName ? `via ${e.resource.supplierName}` : '',
                        ].filter(Boolean).join(' · '),
                        start: e.start.toISOString(),
                        end: e.end.toISOString(),
                    })),
                }),
            });

            if (!response.ok) { setGcalStatus('error'); return; }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(trip.destination ?? 'trip').replace(/[^a-z0-9]/gi, '_')}.ics`;
            a.click();
            URL.revokeObjectURL(url);
            setGcalStatus('success');
        } catch {
            setGcalStatus('error');
        } finally {
            setGcalLoading(false);
        }
    };

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <CalendarDays className="h-10 w-10 opacity-30" />
                <div className="text-center">
                    <p className="font-medium">No activities scheduled</p>
                    <p className="text-sm mt-1">Add experiences to your itinerary to see them here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                    {Array.from(new Set(events.map(e => e.resource.category))).map(cat => (
                        <span key={cat} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: colorFor(cat) }} />
                            {cat}
                        </span>
                    ))}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportToGoogle}
                    disabled={gcalLoading}
                    className="gap-1.5 text-xs shrink-0"
                >
                    {gcalLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ExternalLink className="h-3.5 w-3.5" />
                    }
                    {gcalStatus === 'success' ? 'Exported!' : gcalStatus === 'error' ? 'Export failed' : 'Export to Google Calendar'}
                </Button>
            </div>

            {/* Body: calendar + optional detail panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* Calendar */}
                <div className="flex-1 overflow-hidden p-3 min-w-0">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        defaultDate={defaultDate}
                        defaultView="month"
                        views={['month', 'week', 'day']}
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        components={{ event: CustomEvent as any }}
                        onSelectEvent={(e) => setSelected(selected?.id === (e as CalEvent).id ? null : e as CalEvent)}
                        popup
                    />
                </div>

                {/* Detail panel — slides in when an event is selected */}
                {selected && (
                    <div className="w-72 shrink-0 border-l bg-background overflow-y-auto flex flex-col">
                        {/* Image */}
                        <div className="relative">
                            {selected.resource.image ? (
                                <img
                                    src={selected.resource.image}
                                    alt={selected.title}
                                    className="w-full h-40 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-full h-40 bg-muted flex items-center justify-center">
                                    <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                            )}
                            <button
                                onClick={() => setSelected(null)}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                            {selected.resource.category && (
                                <span
                                    className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded text-white"
                                    style={{ background: selected.resource.color }}
                                >
                                    {selected.resource.category}
                                </span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-3 flex-1">
                            <h3 className="font-semibold text-sm leading-snug">{selected.title}</h3>

                            {/* Date & time */}
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-foreground">
                                        {format(selected.start, 'EEEE, d MMMM yyyy')}
                                    </p>
                                    <p>{format(selected.start, 'h:mm a')} – {format(selected.end, 'h:mm a')}</p>
                                </div>
                            </div>

                            {/* Duration */}
                            {selected.resource.duration && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    <span>{selected.resource.duration}</span>
                                </div>
                            )}

                            {/* Rating */}
                            {selected.resource.rating > 0 && (
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                    <Star className="h-3.5 w-3.5 fill-amber-500" />
                                    <span className="font-semibold">{selected.resource.rating.toFixed(1)}</span>
                                </div>
                            )}

                            {/* Price */}
                            {selected.resource.price > 0 && (
                                <div className="pt-1 border-t">
                                    <p className="text-xs text-muted-foreground">Price</p>
                                    <p className="text-lg font-bold text-primary">
                                        {fmtPrice(selected.resource.price, selected.resource.currency)}
                                    </p>
                                </div>
                            )}

                            {/* Supplier */}
                            {selected.resource.supplierName && (
                                <p className="text-[11px] text-muted-foreground">via {selected.resource.supplierName}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
