import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../../token';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const { productId } = await params;
    try {
        const res = await bridgifyFetch(`/attractions/products/${encodeURIComponent(productId)}/`);
        if (!res.ok) return NextResponse.json({ photos: [] });
        const data = await res.json();
        const attraction = data?.attraction ?? data;

        // Collect all photo URLs from known fields
        const photos: string[] = [];
        if (attraction.main_photo_url) photos.push(attraction.main_photo_url);
        for (const f of ['photos', 'images', 'gallery', 'media', 'photo_urls']) {
            if (Array.isArray(attraction[f])) {
                for (const p of attraction[f]) {
                    const url = typeof p === 'string' ? p : (p?.url ?? p?.photo_url ?? p?.src);
                    if (url && !photos.includes(url)) photos.push(url);
                }
            }
        }

        // Log keys so we can see what the detail endpoint actually returns
        console.log('[photos] attraction keys:', Object.keys(attraction).filter(k =>
            k.match(/photo|image|media|gallery/i)
        ));

        return NextResponse.json({ photos });
    } catch {
        return NextResponse.json({ photos: [] });
    }
}
