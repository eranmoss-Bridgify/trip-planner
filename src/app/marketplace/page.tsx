'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { ServiceCard } from '@/components/demo/ServiceCard';
import { ServiceDetailsSidebar } from '@/components/demo/ServiceDetailsSidebar';
import { useBridgifySearch } from '@/lib/api-client';
import { bridgifyToAttraction } from '@/lib/bridgify-adapter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import type { Attraction } from '@/types/services';

const PAGE_SIZE = 30;

// useSearchParams() requires a Suspense boundary for prerendering (same pattern as HomePage)
export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get('city') || 'Barcelona';
  const initialCategory = searchParams.get('category') || '';

  const [searchText, setSearchText] = useState(initialCategory || 'tours');
  const [cityName, setCityName] = useState(initialCity);
  const [submitted, setSubmitted] = useState({ text: initialCategory || 'tours', city: initialCity });
  const [page, setPage] = useState(1);
  const [allAttractions, setAllAttractions] = useState<Attraction[]>([]);
  const prevSubmitted = useRef(submitted);

  const { data, error, isLoading, mutate } = useBridgifySearch({
    textSearch: submitted.text,
    cityName: submitted.city,
    page,
    pageSize: PAGE_SIZE,
  });

  // Reset when search changes
  useEffect(() => {
    if (submitted !== prevSubmitted.current) {
      prevSubmitted.current = submitted;
      setPage(1);
      setAllAttractions([]);
    }
  }, [submitted]);

  // Accumulate results across pages
  useEffect(() => {
    if (!data?.attractions) return;
    const incoming = data.attractions.map(bridgifyToAttraction);
    if (page === 1) {
      setAllAttractions(incoming);
    } else {
      setAllAttractions(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        return [...prev, ...incoming.filter(a => !existingIds.has(a.id))];
      });
    }
  }, [data, page]);

  const totalCount = data?.count ?? 0;
  const hasMore = allAttractions.length > 0 && allAttractions.length < totalCount;
  const isInitialLoad = isLoading && page === 1;
  const isLoadingMore = isLoading && page > 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted({ text: searchText, city: cityName });
  };

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailService, setDetailService] = useState<Attraction | null>(null);

  const handleOpenDetails = (service: any) => {
    setDetailService(service);
    setDetailOpen(true);
  };

  return (
    <div className="container px-4 md:px-6 py-8 space-y-8">
      <ServiceDetailsSidebar
        service={detailService}
        type="Attraction"
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-primary">Explore Experiences</h1>
        <p className="text-muted-foreground">
          Discover tours, activities, and attractions at your destination
        </p>
      </motion.div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search experiences..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative flex-1 sm:max-w-[200px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="City"
            value={cityName}
            onChange={e => setCityName(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" className="gap-2">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {/* Results */}
      {isInitialLoad ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error && allAttractions.length === 0 ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">Could not load experiences</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      ) : allAttractions.length > 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Showing {allAttractions.length} of {totalCount} experience{totalCount !== 1 ? 's' : ''} found
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allAttractions.map(attraction => (
              <ServiceCard
                key={attraction.id}
                service={attraction}
                type="Attraction"
                onOpenDetails={handleOpenDetails}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={isLoadingMore}
                className="gap-2 min-w-40"
              >
                {isLoadingMore ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/30 p-12 text-center space-y-3">
          <p className="text-muted-foreground text-lg">No experiences found</p>
          <p className="text-sm text-muted-foreground">Try a different search or city</p>
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="p-4 pt-0 flex justify-between items-center border-t">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
