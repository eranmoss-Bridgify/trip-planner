import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../token';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;

  try {
    const res = await bridgifyFetch(`/attractions/products/${encodeURIComponent(productId)}/`);
    if (!res.ok) {
      return NextResponse.json({ error: `Bridgify ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
