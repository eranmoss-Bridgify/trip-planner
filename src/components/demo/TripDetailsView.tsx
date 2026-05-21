'use client';

import { useState, useEffect } from 'react';
import { Trip, ACTIVE_TRIP_ID } from '@/lib/mock-data';
import { TripMapView } from './TripMapView';
import { TripCalendarView } from './TripCalendarView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripLeg } from './TripLeg';
import { DocumentsWallet } from './DocumentsWallet';
import { FileText, Navigation, StickyNote, Plus, Calendar, Users, Pencil, List, Map as MapIcon, Plane, ShoppingBag, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';
import { FlightCard } from './FlightCard';
import { useTrips } from '@/context/TripContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShareDialog } from '@/components/demo/ShareDialog';
import { AIChatPanel } from '@/components/demo/AIChatPanel';
import { formatShortDate, fmtPrice } from '@/lib/utils';
import { AddLegModal } from './AddLegModal';
import { EditLegModal } from './EditLegModal';
import { MarketplaceModal } from './MarketplaceModal';
import { ServiceDetailsSidebar } from './ServiceDetailsSidebar';
import { Hotel, Attraction } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Save, CheckCheck } from 'lucide-react';

export function TripDetailsView({ tripId }: { tripId?: string }) {
    const { trips, addLegToTrip, updateLeg, splitLeg, removeLeg, removeTrip } = useTrips();
    const router = useRouter();
    const { user } = useAuth();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const trip = tripId ? trips.find(t => t.id === tripId) : (trips.find(t => t.id === ACTIVE_TRIP_ID) || trips[0]);

    const [view, setView] = useState<'itinerary' | 'calendar' | 'map'>('itinerary');
    const [sidebarTab, setSidebarTab] = useState<'flights' | 'notes' | 'documents'>('flights');
    const [isEditing, setIsEditing] = useState(false);
    const [tripName, setTripName] = useState(trip?.name || '');
    // Track active leg by index or ID:
    const [activeLegId, setActiveLegId] = useState<string | null>(trip?.legs?.[0]?.id || null);
    const [legModalMode, setLegModalMode] = useState<'add' | 'edit' | null>(null);
    const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
    const [marketplaceTab, setMarketplaceTab] = useState('all');

    // Sidebar State
    const [isServiceDetailsOpen, setIsServiceDetailsOpen] = useState(false);
    const [selectedServiceForDetails, setSelectedServiceForDetails] = useState<Hotel | Attraction | null>(null);
    const [selectedServiceType, setSelectedServiceType] = useState<'Hotel' | 'Attraction' | null>(null);
    const [contextFlight, setContextFlight] = useState<any>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('wv_flight_context');
        if (stored) setContextFlight(JSON.parse(stored));
    }, []);

    const handleOpenServiceDetails = (service: Hotel | Attraction, type: 'Hotel' | 'Attraction') => {
        setSelectedServiceForDetails(service);
        setSelectedServiceType(type);
        setIsServiceDetailsOpen(true);
    };

    const handleOpenMarketplace = (tab: string = 'all') => {
        setMarketplaceTab(tab);
        setIsMarketplaceOpen(true);
    };

    if (!trip) return <div>Trip not found</div>;

    // Safety fallback if activeLegId is null but legs exist
    const currentActiveLegId = activeLegId || trip.legs[0]?.id;
    const activeLeg = trip.legs.find(l => l.id === currentActiveLegId);

    const handleAddLeg = () => {
        setLegModalMode('add');
    };

    const handleSaveNewLeg = (title: string, locationName: string, startDate: string, endDate: string) => {
        addLegToTrip(
            trip.id,
            title,
            locationName,
            startDate,
            endDate
        );

        setTimeout(() => {
            setActiveLegId(`leg-${trip.id}-${trip.legs.length + 1}`);
        }, 50);
    };

    const handleDeleteLeg = (legId: string) => {
        if (!trip) return;
        const currentLegIndex = trip.legs.findIndex(l => l.id === legId);
        removeLeg(trip.id, legId);

        // Find next apparent leg to make active
        const newLegs = trip.legs.filter(l => l.id !== legId);
        if (newLegs.length > 0) {
            // Try to set it to the next leg, or if it was the last leg, the new last leg
            const newIndex = Math.min(currentLegIndex, newLegs.length - 1);
            setActiveLegId(newLegs[newIndex].id);
        } else {
            setActiveLegId(null);
        }
    };

    const lastLeg = trip.legs[trip.legs.length - 1];
    const defaultStartDateForNewLeg = lastLeg ? lastLeg.endDate : trip.startDate;
    const defaultEndDateForNewLeg = (() => {
        const [y, m, d] = defaultStartDateForNewLeg.split('-').map(Number);
        const end = new Date(y, m - 1, d + 3);
        return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    })();
    const newLegBlank = {
        id: '__new__',
        title: '',
        location: '',
        startDate: defaultStartDateForNewLeg,
        endDate: defaultEndDateForNewLeg,
        hotels: [],
        arrivalTransfer: null,
        days: [],
    };

    return (
        <div className="container px-4 md:px-6 py-8 space-y-8">
<EditLegModal
                isOpen={legModalMode !== null}
                onClose={() => setLegModalMode(null)}
                leg={legModalMode === 'add' ? newLegBlank as any : (activeLeg ?? newLegBlank as any)}
                isNew={legModalMode === 'add'}
                onUpdate={(updates) => {
                    if (legModalMode === 'add') {
                        handleSaveNewLeg(
                            updates.title ?? '',
                            updates.location ?? '',
                            updates.startDate ?? defaultStartDateForNewLeg,
                            updates.endDate ?? defaultEndDateForNewLeg,
                        );
                    } else if (activeLeg) {
                        updateLeg(trip.id, activeLeg.id, updates);
                    }
                    setLegModalMode(null);
                }}
                onSplit={(splitDate, newCity) => {
                    if (activeLeg) splitLeg(trip.id, activeLeg.id, splitDate, newCity);
                    setLegModalMode(null);
                }}
            />

            <MarketplaceModal
                isOpen={isMarketplaceOpen}
                onClose={() => setIsMarketplaceOpen(false)}
                destination={activeLeg?.location}
                defaultTab={marketplaceTab}
                vibes={trip.vibes}
                legStartDate={activeLeg?.startDate}
                legEndDate={activeLeg?.endDate}
                onOpenServiceDetails={handleOpenServiceDetails}
            />

            <ServiceDetailsSidebar
                isOpen={isServiceDetailsOpen}
                onClose={() => setIsServiceDetailsOpen(false)}
                service={selectedServiceForDetails}
                type={selectedServiceType}
                tripId={trip.id}
                legId={currentActiveLegId}
            />
            <AuthModal
                open={authModalOpen}
                onOpenChange={setAuthModalOpen}
                onAuthenticated={async () => {
                    setSaveStatus('saving');
                    const res = await fetch('/api/trips', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trips }),
                    });
                    setSaveStatus(res.ok ? 'saved' : 'idle');
                    if (res.ok) setTimeout(() => setSaveStatus('idle'), 3000);
                }}
            />

            <AIChatPanel trip={trip} onOpenServiceDetails={handleOpenServiceDetails} />
            {/* Trip Header */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 group">
                            {isEditing ? (
                                <Input
                                    value={tripName}
                                    onChange={(e) => setTripName(e.target.value)}
                                    className="text-3xl font-bold h-auto py-1 px-2 w-full max-w-md"
                                    autoFocus
                                    onBlur={() => setIsEditing(false)}
                                />
                            ) : (
                                <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                                    {tripName || trip.name}
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={() => setIsEditing(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </h1>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatShortDate(trip.startDate)} - {formatShortDate(trip.endDate)}
                            </div>
                            <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {trip.passengers?.adults || 1} Adults, {trip.passengers?.children || 0} Children
                            </div>
                            {trip.vibes && trip.vibes.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap ml-2">
                                    {trip.vibes.map(vibe => (
                                        <Badge key={vibe} variant="secondary" className="font-normal text-xs bg-primary/10 text-primary capitalize">
                                            {vibe.replace('_', ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap justify-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete trip"
                            onClick={() => {
                                if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;
                                removeTrip(trip.id);
                                router.push('/trips');
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <ShareDialog trip={trip} />
                        <div className="flex bg-muted rounded-md p-1 items-center">
                            <Button
                                variant={view === 'itinerary' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => setView('itinerary')}
                            >
                                <List className="h-4 w-4" /> List
                            </Button>
                            <Button
                                variant={view === 'calendar' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => setView('calendar')}
                            >
                                <Calendar className="h-4 w-4" /> Calendar
                            </Button>
                            <Button
                                variant={view === 'map' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => setView('map')}
                            >
                                <MapIcon className="h-4 w-4" /> Map
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                {/* Main Content */}
                <div className="space-y-6">
                    {/* View Toggle & Leg Tabs */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex bg-muted/50 p-1 rounded-lg">
                            <button
                                onClick={() => setView('itinerary')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'itinerary' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <List className="h-4 w-4" /> List
                                </div>
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Calendar
                                </div>
                            </button>
                            <button
                                onClick={() => setView('map')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'map' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Navigation className="h-4 w-4" />
                                    Map
                                </div>
                            </button>
                        </div>
                    </div>

                    {view === 'itinerary' ? (
                        <div className="space-y-6 border rounded-xl bg-card p-6 shadow-sm">
                            {/* Browser-like Tabs for Legs */}
                            <div className="flex items-center gap-2 border-b pb-4 overflow-x-auto">
                                {trip.legs?.map((leg) => (
                                    <div key={leg.id} className="flex items-center group">
                                        <button
                                            onClick={() => setActiveLegId(leg.id)}
                                            className={`px-4 py-2 rounded-t-lg border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${currentActiveLegId === leg.id ? 'border-primary text-foreground bg-muted/30' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span>{leg.title}</span>
                                                <span className="text-[10px] font-normal opacity-70 mt-0.5">
                                                    {formatShortDate(leg.startDate)} - {formatShortDate(leg.endDate)}
                                                </span>
                                            </div>
                                        </button>
                                                        {currentActiveLegId === leg.id && (
                                            <button
                                                onClick={() => setLegModalMode('edit')}
                                                className="ml-1 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                                                title="Edit destination"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <Button variant="ghost" size="icon" onClick={handleAddLeg} className="rounded-full h-8 w-8 ml-2 text-muted-foreground">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Active Leg Content */}
                            <div className="pt-4">
                                {activeLeg ? (
                                    <TripLeg
                                        key={activeLeg.id}
                                        leg={activeLeg}
                                        tripId={trip.id}
                                        onOpenMarketplace={(tab?: string) => handleOpenMarketplace(tab)}
                                        onOpenServiceDetails={handleOpenServiceDetails}
                                        onDelete={() => handleDeleteLeg(activeLeg.id)}
                                    />
                                ) : (
                                    <div className="py-12 text-center">
                                        <p className="text-muted-foreground">No legs found for this trip. Add a destination to get started.</p>
                                        <Button className="mt-4" onClick={handleAddLeg}>Add Destination</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : view === 'calendar' ? (
                        <div className="rounded-xl overflow-hidden border bg-card shadow-sm h-[680px] relative">
                            <TripCalendarView trip={trip} />
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden border bg-card shadow-sm h-[600px] relative">
                            <TripMapView trip={trip} />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Cart Summary */}
                    {(() => {
                        let totalPlannedPrice = 0;
                        let plannedItemsCount = 0;
                        let currency = 'USD'; // Assuming USD for mixed or fallback
                        const plannedItems: { name: string; price: number; currency: string }[] = [];

                        trip.legs.forEach(leg => {
                            (leg.hotels || []).forEach(h => {
                                if (h.hotel.bookingStatus === 'planned') {
                                    const nights = Math.ceil((new Date(h.checkOut).getTime() - new Date(h.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                                    const total = h.hotel.price * (nights > 0 ? nights : 1);
                                    totalPlannedPrice += total;
                                    plannedItemsCount++;
                                    currency = h.hotel.currency;
                                    plannedItems.push({ name: h.hotel.name, price: total, currency: h.hotel.currency });
                                }
                            });
                            if (leg.arrivalTransfer?.bookingStatus === 'planned') {
                                totalPlannedPrice += leg.arrivalTransfer.price;
                                plannedItemsCount++;
                                currency = leg.arrivalTransfer.currency;
                                plannedItems.push({ name: leg.arrivalTransfer.name, price: leg.arrivalTransfer.price, currency: leg.arrivalTransfer.currency });
                            }
                            (leg.days || []).forEach(day => {
                                (day.activities || []).forEach(act => {
                                    if (act.bookingStatus === 'planned') {
                                        totalPlannedPrice += act.price;
                                        plannedItemsCount++;
                                        currency = act.currency;
                                        plannedItems.push({ name: act.name, price: act.price, currency: act.currency });
                                    }
                                });
                            });
                        });

                        trip.unscheduled.forEach(item => {
                            if (item.bookingStatus === 'planned') {
                                totalPlannedPrice += item.price;
                                plannedItemsCount++;
                                currency = item.currency;
                                plannedItems.push({ name: item.name, price: item.price, currency: item.currency });
                            }
                        });

                        if (plannedItemsCount === 0) return null;

                        return (
                            <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShoppingBag className="h-4 w-4 text-blue-700" />
                                    <h3 className="font-semibold text-blue-900 text-sm">Shopping Cart</h3>
                                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                        {plannedItemsCount} item{plannedItemsCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {plannedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-sm">
                                            <span className="text-blue-900 line-clamp-2 pr-2">{item.name}</span>
                                            <span className="text-blue-950 font-medium whitespace-nowrap">{fmtPrice(item.price, item.currency)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-end mb-4 pt-3 border-t border-blue-200/50">
                                    <div className="text-sm font-medium text-blue-800">Total Due</div>
                                    <div className="text-xl font-bold text-blue-950">{fmtPrice(totalPlannedPrice, currency)}</div>
                                </div>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm w-full h-9 flex justify-center items-center gap-2"
                                    onClick={() => router.push('/cart')}
                                >
                                    <ShieldCheck className="h-4 w-4" /> Checkout
                                </Button>
                            </div>
                        );
                    })()}

                    {/* Save Itinerary */}
                    {(() => {
                        const saveItinerary = async () => {
                            setSaveStatus('saving');
                            const res = await fetch('/api/trips', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ trips }),
                            });
                            setSaveStatus(res.ok ? 'saved' : 'idle');
                            if (res.ok) setTimeout(() => setSaveStatus('idle'), 3000);
                        };

                        return (
                            <Button
                                variant="outline"
                                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                                disabled={saveStatus === 'saving'}
                                onClick={() => {
                                    if (!user) { setAuthModalOpen(true); return; }
                                    saveItinerary();
                                }}
                            >
                                {saveStatus === 'saved'
                                    ? <><CheckCheck className="h-4 w-4 text-green-600" /> Saved!</>
                                    : saveStatus === 'saving'
                                    ? <><Save className="h-4 w-4 animate-pulse" /> Saving…</>
                                    : <><Save className="h-4 w-4" /> Save Itinerary</>}
                            </Button>
                        );
                    })()}

                    <Tabs value={sidebarTab} onValueChange={(v: any) => setSidebarTab(v)} className="w-full">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="flights" className="text-xs sm:text-sm">Flights</TabsTrigger>
                            <TabsTrigger value="notes" className="text-xs sm:text-sm">Notes</TabsTrigger>
                            <TabsTrigger value="documents" className="text-xs sm:text-sm">Docs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="flights" className="mt-4 space-y-4">
                            <div className="bg-card rounded-xl border p-4 shadow-sm">
                                <h3 className="font-semibold mb-4 text-sm flex justify-between items-center">
                                    Attached Flights
                                    <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{contextFlight ? 1 : 0}</span>
                                </h3>
                                {contextFlight ? (
                                    <div className="space-y-4">
                                        <FlightCard flight={contextFlight} hidePlanTrip={true} />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No flights attached to this trip.</p>
                                )}
                                <Button variant="ghost" size="sm" className="w-full mt-4 text-muted-foreground hover:text-foreground">
                                    {contextFlight ? "Attach Another Flight" : "Attach Flight"}
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="notes" className="mt-4 space-y-4">
                            <div className="bg-card rounded-xl border p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <StickyNote className="h-4 w-4 text-orange-500" /> Notes
                                    </h3>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                                </div>
                                {trip.notes.length > 0 ? (
                                    <div className="space-y-3">
                                        {trip.notes.map(note => (
                                            <div key={note.id} className="p-3 bg-muted/50 rounded-lg text-sm border">
                                                <p className="font-medium mb-1 line-clamp-1">{note.title}</p>
                                                <p className="text-muted-foreground line-clamp-2 text-xs">{note.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No notes added.</p>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="documents" className="mt-4">
                            <DocumentsWallet initialDocs={trip.documents} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <div className="flex justify-center mt-12 mb-8">
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => {
                    if (confirm('Reset all trip data to defaults? This cannot be undone.')) {
                        localStorage.removeItem('wandervault_trips');
                        window.location.reload();
                    }
                }}>
                    Reset all trip data
                </Button>
            </div>
        </div >
    );
}
