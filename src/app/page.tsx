'use client';

import { motion } from 'framer-motion';
import { UPCOMING_FLIGHT } from '@/lib/mock-data';
import { FlightCard } from '@/components/demo/FlightCard';
import { TripCard } from '@/components/demo/TripCard';
import { Button } from '@/components/ui/button';
import { OnboardingWizard } from '@/components/demo/OnboardingWizard';
import { useTrips } from '@/context/TripContext';

export default function Home() {
  const { trips } = useTrips();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="container px-4 md:px-6 py-8 space-y-8">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-primary">
          Shalom, Ofir.
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
        {/* Main Content: Flight & Active Trip */}
        <div className="space-y-8">
          <motion.section variants={item} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Flight</h2>
            <FlightCard flight={UPCOMING_FLIGHT} hidePlanTrip={trips.some(t => t.attachedFlights?.some(f => f.id === UPCOMING_FLIGHT.id))} />
            {trips.some(t => t.attachedFlights?.some(f => f.id === UPCOMING_FLIGHT.id)) && (
              <TripCard trip={trips.find(t => t.attachedFlights?.some(f => f.id === UPCOMING_FLIGHT.id))!} />
            )}
          </motion.section>

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
        </div>

        {/* Sidebar: Quick Actions / Promos */}
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
              Experience more comfort on your flight to Paris.
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
