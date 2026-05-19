'use client';

import useSWR from 'swr';
import type { BridgifySearchResponse, BridgifyDetailResponse, BridgifyAvailabilityResponse } from './bridgify-types';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const err = new Error(`API error: ${res.status}`);
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return res.json();
}

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
};

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export function useBridgifySearch(params: {
  textSearch?: string;
  cityName?: string;
  page?: number;
  pageSize?: number;
}) {
  const { textSearch, cityName, page = 1, pageSize = 50 } = params;
  const shouldFetch = textSearch || cityName;
  const qs = buildQuery({
    text_search: textSearch,
    city_name: cityName,
    page,
    page_size: pageSize,
  });

  return useSWR<BridgifySearchResponse>(
    shouldFetch ? `/api/bridgify/search${qs}` : null,
    fetcher,
    SWR_OPTIONS,
  );
}

export function useBridgifyDetail(productId: string | null) {
  return useSWR<BridgifyDetailResponse>(
    productId ? `/api/bridgify/${encodeURIComponent(productId)}` : null,
    fetcher,
    SWR_OPTIONS,
  );
}

export function useBridgifyAvailability(params: {
  productId: string | null;
  dateFrom?: string;
  dateTo?: string;
  availabilityType?: string | null;
}) {
  const { productId, dateFrom, dateTo, availabilityType } = params;
  const shouldFetch = productId && dateFrom && dateTo;
  const qs = buildQuery({ date_from: dateFrom, date_to: dateTo, availability_type: availabilityType ?? undefined });

  return useSWR<BridgifyAvailabilityResponse>(
    shouldFetch ? `/api/bridgify/${encodeURIComponent(productId!)}/availability${qs}` : null,
    fetcher,
    { ...SWR_OPTIONS, shouldRetryOnError: false },
  );
}
