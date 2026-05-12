'use client';

import { HOTELS, ATTRACTIONS, Hotel, Attraction } from '@/lib/mock-data';
import { ServiceCard } from '@/components/demo/ServiceCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { use, useState } from 'react';
import { useTrips } from '@/context/TripContext';
import { ServiceDetailsSidebar } from '@/components/demo/ServiceDetailsSidebar';

export default function ExplorePage({ params, searchParams }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ date?: string }>
}) {
    const { id } = use(params);
    const resolvedSearchParams = use(searchParams);
    const date = resolvedSearchParams.date;

    const { trips } = useTrips();
    const trip = trips.find(t => t.id === id);
    const leg = trip?.legs[0]; // fallback to first leg

    const [isServiceDetailsOpen, setIsServiceDetailsOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Hotel | Attraction | null>(null);
    const [selectedType, setSelectedType] = useState<'Hotel' | 'Attraction' | null>(null);

    const handleOpenDetails = (service: Hotel | Attraction, type: 'Hotel' | 'Attraction') => {
        setSelectedService(service);
        setSelectedType(type);
        setIsServiceDetailsOpen(true);
    };

    return (
        <div className="container px-4 md:px-6 py-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/trip/${id}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Explore Paris</h1>
                    {date && (
                        <p className="text-muted-foreground">
                            Finding activities for {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </div>
            </div>

            <ServiceDetailsSidebar
                isOpen={isServiceDetailsOpen}
                onClose={() => setIsServiceDetailsOpen(false)}
                service={selectedService}
                type={selectedType}
                tripId={trip?.id || id}
                legId={leg?.id || ''}
            />

            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search hotels, tours, events..." className="pl-10 bg-background" />
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" /> Filters
                </Button>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="all" className="rounded-sm">All</TabsTrigger>
                    <TabsTrigger value="hotels" className="rounded-sm">Hotels</TabsTrigger>
                    <TabsTrigger value="attractions" className="rounded-sm">Attractions</TabsTrigger>
                    <TabsTrigger value="food" className="rounded-sm">Food & Drink</TabsTrigger>
                    <TabsTrigger value="transport" className="rounded-sm">Transport</TabsTrigger>
                    <TabsTrigger value="events" className="rounded-sm">Events</TabsTrigger>
                    <TabsTrigger value="essentials" className="rounded-sm">Essentials</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold">Recommended Hotels</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {HOTELS.slice(0, 3).map((hotel, i) => (
                                <ServiceCard key={i} service={hotel} type="Hotel" onOpenDetails={handleOpenDetails} />
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold">Top Attractions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ATTRACTIONS.map((attraction, i) => (
                                <ServiceCard key={i} service={attraction} type="Attraction" onOpenDetails={handleOpenDetails} />
                            ))}
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="hotels" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {HOTELS.map((hotel, i) => (
                            <ServiceCard key={i} service={hotel} type="Hotel" onOpenDetails={handleOpenDetails} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="attractions" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ATTRACTIONS.map((attraction, i) => (
                            <ServiceCard key={i} service={attraction} type="Attraction" onOpenDetails={handleOpenDetails} />
                        ))}
                    </div>
                </TabsContent>
                {/* Other tabs empty for demo */}
                <TabsContent value="transport" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ATTRACTIONS.filter(a => a.category === 'Transfer').map((attraction, i) => (
                            <ServiceCard key={i} service={attraction} type="Attraction" onOpenDetails={handleOpenDetails} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="events" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ATTRACTIONS.filter(a => a.category === 'Event').map((attraction, i) => (
                            <ServiceCard key={i} service={attraction} type="Attraction" onOpenDetails={handleOpenDetails} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="essentials" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ATTRACTIONS.filter(a => a.category === 'ESim' || a.category === 'CityPass').map((attraction, i) => (
                            <ServiceCard key={i} service={attraction} type="Attraction" onOpenDetails={handleOpenDetails} />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
