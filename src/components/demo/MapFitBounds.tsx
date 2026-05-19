'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface Props {
    pins: { lat: number; lng: number }[];
}

export function MapFitBounds({ pins }: Props) {
    const map = useMap();

    useEffect(() => {
        if (pins.length === 0) return;
        if (pins.length === 1) {
            map.setView([pins[0].lat, pins[0].lng], 14);
            return;
        }
        const lats = pins.map(p => p.lat);
        const lngs = pins.map(p => p.lng);
        map.fitBounds(
            [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
            { padding: [50, 50], maxZoom: 15 }
        );
    }, [map, pins]);

    return null;
}
