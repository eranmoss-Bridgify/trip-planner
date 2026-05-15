import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../../token';

// Bridgify production returns:
//   { "dates": [{ "YYYY-MM-DD": ["HH:MM:SS", ...] }] }
// We normalise this into our internal shape:
//   { data: { type, slots: [{ date, times }] } }
// Times of "00:00:00" mean "all day" — filtered out.

function normaliseAvailability(raw: any, availabilityType?: string | null) {
  const dateEntries: Record<string, string[]>[] = raw?.dates ?? [];
  const slots = dateEntries.flatMap((obj) =>
    Object.entries(obj).map(([date, rawTimes]) => {
      const times = (rawTimes as string[])
        .filter((t) => t !== '00:00:00')
        .map((t) => t.slice(0, 5)); // "HH:MM:SS" → "HH:MM"
      return { date, times };
    }),
  );
  slots.sort((a, b) => a.date.localeCompare(b.date));
  return {
    data: {
      type: availabilityType ?? null,
      slots,
    },
  };
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

  try {
    const res = await bridgifyFetch(
      `/attractions/products/availability/${encodeURIComponent(productId)}/?${qs}`,
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bridgify ${res.status}`, sandbox: true },
        { status: res.status },
      );
    }

    const raw = await res.json();
    return NextResponse.json(normaliseAvailability(raw, availabilityType));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
