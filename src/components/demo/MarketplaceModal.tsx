import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Filter, Compass } from 'lucide-react';
import { HOTELS, ATTRACTIONS, Hotel, Attraction } from '@/lib/mock-data';
import { ServiceCard } from '@/components/demo/ServiceCard';
import { Button } from '@/components/ui/button';

interface MarketplaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination?: string;
    defaultTab?: string;
    onOpenServiceDetails?: (service: Hotel | Attraction, type: 'Hotel' | 'Attraction') => void;
}

export function MarketplaceModal({ isOpen, onClose, destination = "Paris", defaultTab = "all", onOpenServiceDetails }: MarketplaceModalProps) {
    // Basic filter for demo purposes - in a real app this would complex
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                            <Compass className="h-6 w-6 text-blue-500" />
                            Explore {destination}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Find top-rated hotels, tours, and experiences to add to your trip.
                        </p>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row gap-4 mb-6 sticky top-0 bg-slate-50/50 z-10 py-2 backdrop-blur-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search hotels, tours, events..."
                                className="pl-10 bg-background shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="gap-2 bg-background shadow-sm">
                            <Filter className="h-4 w-4" /> Filters
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-muted/70 p-1 w-full flex overflow-x-auto justify-start sticky top-[60px] z-10 backdrop-blur-md">
                            <TabsTrigger value="all" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">All</TabsTrigger>
                            <TabsTrigger value="hotels" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">Hotels</TabsTrigger>
                            <TabsTrigger value="attractions" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">Attractions</TabsTrigger>
                            <TabsTrigger value="food" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">Food & Drink</TabsTrigger>
                            <TabsTrigger value="transport" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">Transport</TabsTrigger>
                            <TabsTrigger value="events" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">Events</TabsTrigger>
                            <TabsTrigger value="essentials" className="rounded-sm flex-1 whitespace-nowrap min-w-[100px]">Essentials</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="space-y-8 mt-6">
                            <section className="space-y-4">
                                <h2 className="text-xl font-semibold">Recommended Hotels</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {HOTELS.slice(0, 3).map((hotel, i) => (
                                        <ServiceCard
                                            key={`all-h-${i}`}
                                            service={hotel}
                                            type="Hotel"
                                            isInModal
                                            onCloseModal={onClose}
                                            onOpenDetails={onOpenServiceDetails}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl font-semibold">Top Attractions</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {ATTRACTIONS.slice(0, 6).map((attraction, i) => (
                                        <ServiceCard
                                            key={`all-a-${i}`}
                                            service={attraction}
                                            type="Attraction"
                                            isInModal
                                            onCloseModal={onClose}
                                            onOpenDetails={onOpenServiceDetails}
                                        />
                                    ))}
                                </div>
                            </section>
                        </TabsContent>

                        <TabsContent value="hotels" className="space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {HOTELS.map((hotel, i) => (
                                    <ServiceCard
                                        key={`h-${i}`}
                                        service={hotel}
                                        type="Hotel"
                                        isInModal
                                        onCloseModal={onClose}
                                        onOpenDetails={onOpenServiceDetails}
                                    />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="attractions" className="space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ATTRACTIONS.map((attraction, i) => (
                                    <ServiceCard
                                        key={`a-${i}`}
                                        service={attraction}
                                        type="Attraction"
                                        isInModal
                                        onCloseModal={onClose}
                                        onOpenDetails={onOpenServiceDetails}
                                    />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="transport" className="space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ATTRACTIONS.filter(a => a.category === 'Transfer').map((attraction, i) => (
                                    <ServiceCard
                                        key={`t-${i}`}
                                        service={attraction}
                                        type="Attraction"
                                        isInModal
                                        onCloseModal={onClose}
                                        onOpenDetails={onOpenServiceDetails}
                                    />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="events" className="space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ATTRACTIONS.filter(a => a.category === 'Event').map((attraction, i) => (
                                    <ServiceCard
                                        key={`e-${i}`}
                                        service={attraction}
                                        type="Attraction"
                                        isInModal
                                        onCloseModal={onClose}
                                        onOpenDetails={onOpenServiceDetails}
                                    />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="essentials" className="space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ATTRACTIONS.filter(a => a.category === 'ESim' || a.category === 'CityPass').map((attraction, i) => (
                                    <ServiceCard
                                        key={`es-${i}`}
                                        service={attraction}
                                        type="Attraction"
                                        isInModal
                                        onCloseModal={onClose}
                                        onOpenDetails={onOpenServiceDetails}
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
