import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../token';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get('city_name') ?? '';
  const text = searchParams.get('text_search') ?? '';
  const page = searchParams.get('page') ?? '1';
  const pageSize = searchParams.get('page_size') ?? '50';

  // Bridgify text_search is accent-sensitive — "Sagrada Família" returns 0 results, "Sagrada Familia" returns 50.
  const normalisedText = text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const qs = new URLSearchParams({ city_name: city, text_search: normalisedText, page, page_size: pageSize });

  try {
    const res = await bridgifyFetch(`/attractions/products/?${qs}`);
    if (!res.ok) {
      return NextResponse.json({ error: `Bridgify ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    if (Array.isArray(data?.attractions)) {
      // Deduplicate by external_id — Bridgify has a pagination bug where the same
      // product appears on multiple pages. Also deduplicates within a single page.
      const seen = new Set<string>();
      data.attractions = data.attractions.filter((a: any) => {
        if (seen.has(a.external_id)) return false;
        seen.add(a.external_id);
        return true;
      });
      // Sort best sellers to the front
      data.attractions.sort((a: any, b: any) => {
        const aBS = a.additional_info?.external_exclusive_fields?.best_seller ? 1 : 0;
        const bBS = b.additional_info?.external_exclusive_fields?.best_seller ? 1 : 0;
        return bBS - aBS;
      });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
