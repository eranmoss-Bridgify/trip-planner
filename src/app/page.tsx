'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlightCard, FlightCardSkeleton } from '@/components/demo/FlightCard';
import { TripCard } from '@/components/demo/TripCard';
import { ServiceCard } from '@/components/demo/ServiceCard';
import { Button } from '@/components/ui/button';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrips } from '@/context/TripContext';
import { useFlights, useCatalogBrowse, postAvailability } from '@/lib/api-client';
import { ctsToFlight, ctsToHotel } from '@/lib/cts-adapter';
import { ServiceDetailsSidebar } from '@/components/demo/ServiceDetailsSidebar';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { addDays, format } from 'date-fns';
import type { Hotel } from '@/types/services';

export default function Home() {
  const { trips } = useTrips();
  const { data: flightData, error: flightError, isLoading: flightsLoading, mutate: retryFlights } = useFlights(5);
  const { data: hotelData, error: hotelError, isLoading: hotelsLoading, mutate: retryHotels } = useCatalogBrowse({ type: 'HOTEL', sort: 'rating', limit: 6 });

  const flights = flightData?.results?.map(ctsToFlight) ?? [];
  const topFlight = flights[0] ?? null;
  const hotels = hotelData?.results?.map(ctsToHotel) ?? [];

  const tripWithFlight = topFlight
    ? trips.find(t => t.attachedFlights?.some((f: any) => f.id === topFlight.id))
    : undefined;

  const defaultCheckIn = topFlight?.arrivalTime
    ? new Date(topFlight.arrivalTime)
    : addDays(new Date(), 30);
  const defaultCheckOut = addDays(defaultCheckIn, 1);
  const checkInStr = format(defaultCheckIn, 'yyyy-MM-dd');
  const checkOutStr = format(defaultCheckOut, 'yyyy-MM-dd');
  const checkInDisplay = format(defaultCheckIn, 'MMM d');
  const checkOutDisplay = format(defaultCheckOut, 'MMM d');

  const [livePrices, setLivePrices] = useState<Record<string, { price: number; currency: string }>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (!hotels.length) return;
    let cancelled = false;
    setPricesLoading(true);

    const fetchPrices = async () => {
      const results: Record<string, { price: number; currency: string }> = {};
      await Promise.allSettled(
        hotels.map(async (hotel) => {
          const res = await postAvailability(hotel.id, {
            date_from: checkInStr,
            date_to: checkOutStr,
            adults: 1,
            children: 0,
          });
          if (res.ok && res.data?.data?.rooms?.length) {
            let cheapest = Infinity;
            let currency = 'USD';
            for (const room of res.data.data.rooms) {
              for (const rate of room.rates) {
                if (rate.net < cheapest) {
                  cheapest = rate.net;
                  currency = rate.currency;
                }
              }
            }
            if (cheapest < Infinity) {
              results[hotel.id] = { price: cheapest, currency };
            }
          }
        }),
      );
      if (!cancelled) {
        setLivePrices(results);
        setPricesLoading(false);
      }
    };
    fetchPrices();
    return () => { cancelled = true; };
  }, [hotels.map(h => h.id).join(','), checkInStr]);

  const hotelsWithPrices = hotels.map(h => {
    const live = livePrices[h.id];
    return live ? { ...h, price: live.price, currency: live.currency } : h;
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailService, setDetailService] = useState<any>(null);
  const [detailType, setDetailType] = useState<'Hotel' | 'Attraction' | null>(null);

  const handleOpenDetails = (service: any, type: 'Hotel' | 'Attraction') => {
    setDetailService(service);
    setDetailType(type);
    setDetailOpen(true);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="container px-4 md:px-6 py-8 space-y-8">
      <ServiceDetailsSidebar
        service={detailService}
        type={detailType}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        defaultCheckIn={checkInStr}
        defaultCheckOut={checkOutStr}
      />
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-primary">
          Hello, John.
        </h1>
        <p className="text-muted-foreground text-lg">
          Your travel hub. Manage your flights and plan your adventures.
        </p>
      </motion.section>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 md:grid-cols-[2fr_1fr]"
      >
        <div className="space-y-8">
          {/* Upcoming Flight */}
          <motion.section variants={item} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Flight</h2>
            {flightsLoading ? (
              <FlightCardSkeleton />
            ) : flightError ? (
              <ErrorCard message="Could not load flights" onRetry={() => retryFlights()} />
            ) : topFlight ? (
              <>
                <FlightCard flight={topFlight} hidePlanTrip={!!tripWithFlight} />
                {tripWithFlight && <TripCard trip={tripWithFlight} />}
              </>
            ) : (
              <EmptyCard message="No upcoming flights" />
            )}
          </motion.section>

          {/* Your Trips */}
          <motion.section variants={item} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Your Trips</h2>
              <OnboardingWizard />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {trips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </motion.section>

          {/* Top Hotels */}
          <motion.section variants={item} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Top Hotels</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {checkInDisplay} – {checkOutDisplay} · 1 night
              </p>
            </div>
            {hotelsLoading ? (
              <div className="grid gap-6 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </div>
            ) : hotelError ? (
              <ErrorCard message="Could not load hotels" onRetry={() => retryHotels()} />
            ) : hotelsWithPrices.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {hotelsWithPrices.map((hotel) => (
                  <ServiceCard key={hotel.id} service={hotel as any} type="Hotel" checkIn={checkInStr} checkOut={checkOutStr} priceLoading={pricesLoading && !livePrices[hotel.id]} onOpenDetails={handleOpenDetails} />
                ))}
              </div>
            ) : (
              <EmptyCard message="No hotels available" />
            )}
          </motion.section>
        </div>

        {/* Sidebar */}
        <motion.aside variants={item} className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg">Quick Actions</h3>
            <div className="grid gap-2">
              <Button variant="ghost" className="justify-start w-full">Manage Booking</Button>
              <Button variant="ghost" className="justify-start w-full">Select Seats</Button>
              <Button variant="ghost" className="justify-start w-full">Order Meal</Button>
            </div>
          </div>

          <div className="rounded-xl bg-linear-to-br from-secondary/20 to-secondary/5 p-6 space-y-4 border border-secondary/20">
            <h3 className="font-semibold text-lg text-secondary-foreground">Upgrade to Premium</h3>
            <p className="text-sm text-muted-foreground">
              Experience more comfort on your next flight.
            </p>
            <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Check Availability
            </Button>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}

function ServiceCardSkeleton() {
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

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex items-center gap-4">
      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-8 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
