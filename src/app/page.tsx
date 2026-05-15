'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { TripCard } from '@/components/demo/TripCard';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';
import { useTrips } from '@/context/TripContext';
import { Plane, MapPin, Calendar, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

// Flight context from the airline page — in production from the airline's booking system.
const FLIGHT_CONTEXT = {
  origin: 'TLV',
  originCity: 'Tel Aviv',
  destination: 'BCN',
  destinationCity: 'Barcelona',
  destinationCountry: 'Spain',
  flightNumber: 'WV-2026',
  departureTime: '2026-06-15T09:00:00Z',
  arrivalTime: '2026-06-15T13:00:00Z',
  passengers: 1,
  class: 'Economy',
  airline: 'WV',
};

export default function Home() {
  const { trips } = useTrips();

  useEffect(() => {
    sessionStorage.setItem('wv_flight_context', JSON.stringify(FLIGHT_CONTEXT));
  }, []);

  const arrivalDate = new Date(FLIGHT_CONTEXT.arrivalTime);
  const wizardData = {
    destination: FLIGHT_CONTEXT.destinationCity,
    dateFrom: arrivalDate,
    dateTo: new Date(arrivalDate.getTime() + 5 * 24 * 60 * 60 * 1000),
    passengers: FLIGHT_CONTEXT.passengers,
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="container px-4 md:px-6 py-16 md:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-medium backdrop-blur-sm">
              <Plane className="h-4 w-4" />
              Welcome aboard
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Your next adventure starts here
            </h1>
            <p className="text-lg md:text-xl opacity-90">
              Plan your perfect trip with curated experiences, tours, and activities at your destination.
            </p>
            <div className="flex flex-wrap gap-4">
              <OnboardingWizard
                initialData={wizardData}
                trigger={
                  <Button size="lg" variant="secondary" className="gap-2 text-base">
                    <Plus className="h-5 w-5" /> Plan a New Trip
                  </Button>
                }
              />
              <Button asChild size="lg" variant="outline" className="gap-2 text-base bg-white/10 border-white/20 hover:bg-white/20">
                <Link href="/marketplace">
                  Browse Experiences <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Flight Info Bar */}
      <section className="bg-card border-b">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{FLIGHT_CONTEXT.origin} &rarr; {FLIGHT_CONTEXT.destination}</span>
              <span>Flight {FLIGHT_CONTEXT.flightNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(FLIGHT_CONTEXT.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{FLIGHT_CONTEXT.destinationCity}, {FLIGHT_CONTEXT.destinationCountry}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{FLIGHT_CONTEXT.passengers} passenger{FLIGHT_CONTEXT.passengers !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container px-4 md:px-6 py-8 space-y-8">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

          {/* Your Trips */}
          <motion.section variants={item} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Your Trips</h2>
              <OnboardingWizard initialData={wizardData} />
            </div>
            {trips.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {trips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-12 text-center space-y-4">
                <p className="text-muted-foreground text-lg">No trips yet</p>
                <p className="text-sm text-muted-foreground">Create your first trip to start planning experiences at your destination.</p>
                <OnboardingWizard
                  initialData={wizardData}
                  trigger={
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" /> Create Your First Trip
                    </Button>
                  }
                />
              </div>
            )}
          </motion.section>

          {/* Discover Destination */}
          <motion.section variants={item} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Discover {FLIGHT_CONTEXT.destinationCity}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <DestinationCard
                title="Tours & Sightseeing"
                description="Explore iconic landmarks like Sagrada Familia, Park Guell, and the Gothic Quarter"
                icon={<MapPin className="h-5 w-5" />}
                href="/marketplace?city=Barcelona&category=tours"
              />
              <DestinationCard
                title="Food & Culture"
                description="Tapas crawls, cooking classes, and wine tastings in the heart of Catalonia"
                icon={<MapPin className="h-5 w-5" />}
                href="/marketplace?city=Barcelona&category=food"
              />
              <DestinationCard
                title="Day Trips"
                description="Montserrat monastery, Costa Brava beaches, and Girona medieval town"
                icon={<MapPin className="h-5 w-5" />}
                href="/marketplace?city=Barcelona&category=outdoor"
              />
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

function DestinationCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-6 space-y-3 hover:shadow-md hover:border-primary/20 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="font-semibold group-hover:text-primary transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
