'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { Trip } from '@/lib/mock-data';
import type { Attraction } from '@/types/services';
import { fmtPrice } from '@/lib/utils';
import { MapPin, Clock, Star } from 'lucide-react';

// Leaflet must be loaded client-side only
const MapContainer  = dynamic(() => import('react-leaflet').then(m => m.MapContainer),  { ssr: false });
const TileLayer     = dynamic(() => import('react-leaflet').then(m => m.TileLayer),     { ssr: false });
const Marker        = dynamic(() => import('react-leaflet').then(m => m.Marker),        { ssr: false });
const Popup         = dynamic(() => import('react-leaflet').then(m => m.Popup),         { ssr: false });
const MapFitBounds  = dynamic(() => import('./MapFitBounds').then(m => m.MapFitBounds), { ssr: false });

import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

function createNumberIcon(num: number, isSelected: boolean) {
    if (typeof window === 'undefined') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    const bg = isSelected ? '#6366f1' : '#ef4444';
    const size = isSelected ? 32 : 28;
    return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45);transition:all .15s">${num}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2) - 2],
    });
}

interface PinItem {
    id: string;
    availabilityUuid?: string;
    name: string;
    lat: number;
    lng: number;
    hasCoords: boolean;
    mapNum: number;
    price: number;
    currency: string;
    image: string;
    category: string;
    duration: string;
    rating: number;
    supplierName?: string;
    date?: string;
    dayLabel?: string;
}

interface TripMapViewProps {
    trip: Trip;
    onSelectAttraction?: (attraction: Attraction) => void;
}

export function TripMapView({ trip }: TripMapViewProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [enrichedCoords, setEnrichedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
    const [enriching, setEnriching] = useState<Set<string>>(new Set());

    const rawPins = useMemo(() => {
        const items: Array<Omit<PinItem, 'hasCoords' | 'mapNum'>> = [];
        for (const leg of trip.legs ?? []) {
            for (const day of leg.days ?? []) {
                for (const act of day.activities ?? []) {
                    const a = act as any;
                    items.push({
                        id: a.id,
                        availabilityUuid: a.availabilityUuid,
                        name: a.name,
                        lat: a.lat ?? 0,
                        lng: a.lng ?? 0,
                        price: a.price ?? 0,
                        currency: a.currency ?? 'USD',
                        image: a.image ?? '',
                        category: a.category ?? '',
                        duration: a.duration ?? '',
                        rating: a.rating ?? 0,
                        supplierName: a.supplierName,
                        date: day.date,
                        dayLabel: new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                    });
                }
            }
        }
        return items;
    }, [trip]);

    // Auto-enrich activities that are missing coordinates
    useEffect(() => {
        const missing = rawPins.filter(p => !p.lat || !p.lng);
        if (missing.length === 0) return;
        let cancelled = false;
        setEnriching(new Set(missing.map(p => p.id)));
        Promise.all(
            missing.map(async pin => {
                // Detail endpoint requires UUID — use availabilityUuid if present, else fall back to id
                const fetchId = pin.availabilityUuid ?? pin.id;
                try {
                    const res = await fetch(`/api/bridgify/${encodeURIComponent(fetchId)}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    const a = data.attraction;
                    const lat = Number(a?.geolocation?.lat ?? a?.location?.lat);
                    const lng = Number(a?.geolocation?.lng ?? a?.location?.lng);
                    if (lat && lng) return { id: pin.id, lat, lng };
                } catch { /* ignore */ }
                return null;
            })
        ).then(results => {
            if (cancelled) return;
            const coords: Record<string, { lat: number; lng: number }> = {};
            for (const r of results) { if (r) coords[r.id] = { lat: r.lat, lng: r.lng }; }
            if (Object.keys(coords).length > 0) setEnrichedCoords(prev => ({ ...prev, ...coords }));
            setEnriching(new Set());
        });
        return () => { cancelled = true; };
    }, [rawPins]);

    const pins = useMemo<PinItem[]>(() => {
        let mapCounter = 0;
        return rawPins.map(p => {
            const enriched = enrichedCoords[p.id];
            const lat = enriched?.lat ?? p.lat;
            const lng = enriched?.lng ?? p.lng;
            const hasCoords = Boolean(lat && lng);
            if (hasCoords) mapCounter++;
            return { ...p, lat, lng, hasCoords, mapNum: hasCoords ? mapCounter : 0 };
        });
    }, [rawPins, enrichedCoords]);

    const mappedPins = useMemo(() => pins.filter(p => p.hasCoords), [pins]);

    if (pins.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <MapPin className="h-10 w-10 opacity-30" />
                <div className="text-center">
                    <p className="font-medium">No activities yet</p>
                    <p className="text-sm mt-1">Add experiences to your itinerary to see them here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 shrink-0 border-r overflow-y-auto bg-background">
                <div className="p-3 border-b sticky top-0 bg-background z-10">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {pins.length} activit{pins.length === 1 ? 'y' : 'ies'} &middot; {mappedPins.length} on map
                    </p>
                </div>
                <div className="divide-y">
                    {pins.map(pin => {
                        const isSelected = selected === pin.id;
                        const isEnriching = enriching.has(pin.id);
                        const inner = (
                            <>
                                {/* Number badge */}
                                <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                                    {pin.hasCoords ? (
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${
                                            isSelected ? 'bg-indigo-500' : 'bg-red-500'
                                        }`}>
                                            {pin.mapNum}
                                        </div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted border border-border">
                                            {isEnriching
                                                ? <div className="w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground/80 rounded-full animate-spin" />
                                                : <MapPin className="h-3.5 w-3.5 text-muted-foreground/50" />
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnail */}
                                {pin.image ? (
                                    <img
                                        src={pin.image}
                                        alt={pin.name}
                                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-muted-foreground/30" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium line-clamp-2 leading-snug">{pin.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{pin.dayLabel}</p>
                                    {pin.category && (
                                        <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                            {pin.category}
                                        </span>
                                    )}
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                        {pin.price > 0 && (
                                            <span className="text-xs font-semibold text-primary">{fmtPrice(pin.price, pin.currency)}</span>
                                        )}
                                        {pin.rating > 0 && (
                                            <span className="text-xs flex items-center gap-0.5 text-amber-600">
                                                <Star className="h-3 w-3 fill-amber-500" />{pin.rating.toFixed(1)}
                                            </span>
                                        )}
                                        {pin.duration && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                <Clock className="h-3 w-3" />{pin.duration}
                                            </span>
                                        )}
                                    </div>
                                    {pin.supplierName && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">via {pin.supplierName}</p>
                                    )}
                                    {!pin.hasCoords && !isEnriching && (
                                        <p className="text-[10px] text-muted-foreground italic mt-0.5">Location unavailable</p>
                                    )}
                                    {isEnriching && (
                                        <p className="text-[10px] text-muted-foreground italic mt-0.5">Locating…</p>
                                    )}
                                </div>
                            </>
                        );

                        if (pin.hasCoords) {
                            return (
                                <button
                                    key={pin.id}
                                    className={`w-full text-left p-3 flex gap-3 transition-colors cursor-pointer ${
                                        isSelected ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-muted/40 border-l-4 border-transparent'
                                    }`}
                                    onClick={() => setSelected(pin.id === selected ? null : pin.id)}
                                >
                                    {inner}
                                </button>
                            );
                        }
                        return (
                            <div
                                key={pin.id}
                                className="p-3 flex gap-3 opacity-50 cursor-default border-l-4 border-transparent"
                            >
                                {inner}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    center={[41.3851, 2.1734]}
                    zoom={12}
                    style={{ width: '100%', height: '100%' }}
                    scrollWheelZoom
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapFitBounds pins={mappedPins} />
                    {mappedPins.map(pin => (
                        <Marker
                            key={pin.id}
                            position={[pin.lat, pin.lng]}
                            icon={createNumberIcon(pin.mapNum, selected === pin.id)}
                            eventHandlers={{ click: () => setSelected(selected === pin.id ? null : pin.id) }}
                        >
                            <Popup>
                                <div className="min-w-[220px]">
                                    {pin.image && (
                                        <img src={pin.image} alt={pin.name} className="w-full h-28 object-cover rounded-t" />
                                    )}
                                    <div className="p-2 space-y-1">
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                                                {pin.mapNum}
                                            </div>
                                            <p className="font-semibold text-sm leading-snug">{pin.name}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{pin.dayLabel}</p>
                                        {pin.category && (
                                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                {pin.category}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-2">
                                            {pin.price > 0 && <span className="text-xs font-bold text-primary">{fmtPrice(pin.price, pin.currency)}</span>}
                                            {pin.rating > 0 && (
                                                <span className="text-xs flex items-center gap-0.5 text-amber-600">
                                                    <Star className="h-3 w-3 fill-amber-500" />{pin.rating.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        {pin.duration && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{pin.duration}</p>}
                                        {pin.supplierName && <p className="text-[10px] text-muted-foreground">via {pin.supplierName}</p>}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
