import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../token';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get('city_name') ?? '';
  const text = searchParams.get('text_search') ?? '';
  const page = searchParams.get('page') ?? '1';
  const pageSize = searchParams.get('page_size') ?? '50';

  const qs = new URLSearchParams({ city_name: city, text_search: text, page, page_size: pageSize });

  try {
    const res = await bridgifyFetch(`/attractions/products/?${qs}`);
    if (!res.ok) {
      return NextResponse.json({ error: `Bridgify ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    // Sort best sellers to the front
    if (Array.isArray(data?.attractions)) {
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
