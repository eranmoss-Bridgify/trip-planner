import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../../token';

// Bridgify availability requires a UUID. Most products return uuid in search results
// and the adapter stores it directly. For products where uuid is absent in search
// (numeric external_ids from certain suppliers), we resolve via the detail endpoint.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normaliseAvailability(raw: any, availabilityType?: string | null) {
  const dateEntries: Record<string, string[]>[] = raw?.dates ?? [];
  const slots = dateEntries.flatMap((obj) =>
    Object.entries(obj).map(([date, rawTimes]) => {
      const times = (rawTimes as string[])
        .filter((t) => t !== '00:00:00')
        .map((t) => t.slice(0, 5));
      // Keep slot even when times is empty — 00:00:00 means all-day, not unavailable
      return { date, times };
    }),
  );
  slots.sort((a, b) => a.date.localeCompare(b.date));
  return { data: { type: availabilityType ?? null, slots } };
}

async function resolveToUuid(externalId: string): Promise<string> {
  try {
    const res = await bridgifyFetch(`/attractions/products/${encodeURIComponent(externalId)}/`);
    if (!res.ok) { console.warn('[resolve] detail fetch failed', res.status, externalId); return externalId; }
    const data = await res.json();
    const uuid = data?.attraction?.uuid ?? null;
    console.log('[resolve]', externalId, '→ uuid:', uuid, '| keys:', Object.keys(data?.attraction ?? {}));
    return uuid ?? externalId;
  } catch (e) {
    console.error('[resolve] error', externalId, (e as Error).message);
    return externalId;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const dateFrom = req.nextUrl.searchParams.get('date_from') ?? '';
  const dateTo = req.nextUrl.searchParams.get('date_to') ?? '';
  const availabilityType = req.nextUrl.searchParams.get('availability_type');
  const qs = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });

  const uuid = UUID_RE.test(productId) ? productId : await resolveToUuid(productId);

  try {
    const res = await bridgifyFetch(
      `/attractions/products/availability/${encodeURIComponent(uuid)}/?${qs}`,
    );

    if (!res.ok) {
      let body: any = null;
      try { body = await res.json(); } catch { /* ignore */ }
      return NextResponse.json({ error: `Bridgify ${res.status}`, detail: body }, { status: res.status });
    }

    const raw = await res.json();
    return NextResponse.json(normaliseAvailability(raw, availabilityType));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
