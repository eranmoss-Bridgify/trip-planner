'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Plane, MapPin, Sparkles, Building2, Coffee, Ticket, Calendar as CalendarIcon, PersonStanding, Check, TreePine, Wine, ShoppingBag, Heart, Compass, Landmark } from 'lucide-react';
import { useTrips } from '@/context/TripContext';
import { Trip, TripLegData, CURRENT_USER, Hotel, Attraction } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
    initialData?: {
        destination?: string;
        dates?: string;
        dateFrom?: Date;
        dateTo?: Date;
        passengers?: number;
    };
    trigger?: React.ReactNode;
}

const FAMILIARITY_LEVELS = [
    { id: 'first_time', label: 'First Time', desc: 'Show me the must-see sights', icon: Sparkles },
    { id: 'few_times', label: 'Been a few times', desc: 'Mix of classics and hidden gems', icon: MapPin },
    { id: 'second_home', label: 'My second home', desc: 'Only authentic local experiences', icon: Coffee },
];

const VIBES = [
    { id: 'culture', label: 'Museums & Culture', icon: Building2 },
    { id: 'food', label: 'Food & Dining', icon: Coffee },
    { id: 'entertainment', label: 'Shows & Concerts', icon: Ticket },
    { id: 'sports', label: 'Sports Events', icon: PersonStanding },
    { id: 'nature', label: 'Nature & Outdoors', icon: TreePine },
    { id: 'nightlife', label: 'Nightlife & Bars', icon: Wine },
    { id: 'shopping', label: 'Shopping & Fashion', icon: ShoppingBag },
    { id: 'wellness', label: 'Spa & Wellness', icon: Heart },
    { id: 'adventure', label: 'Adventure & Thrills', icon: Compass },
    { id: 'history', label: 'Historical Sites', icon: Landmark },
];

export function OnboardingWizard({ initialData, trigger }: OnboardingWizardProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const { addTrip } = useTrips();
    const router = useRouter();

    // Form State
    const [tripName, setTripName] = useState(initialData?.destination ? `Trip to ${initialData.destination}` : '');
    const [destination, setDestination] = useState(initialData?.destination || '');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: initialData?.dateFrom ?? undefined,
        to: initialData?.dateTo ?? undefined,
    });

    const [pax, setPax] = useState({
        infants: 0,
        children: 0,
        adults: initialData?.passengers || 1,
        elderly: 0
    });

    const [familiarity, setFamiliarity] = useState('');
    const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

    const handleNext = () => {
        if (step === 2 && !destination.trim()) {
            document.getElementById('destination')?.focus();
            return;
        }
        setStep(s => Math.min(s + 1, 3));
    };
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const toggleVibe = (id: string) => {
        setSelectedVibes(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const generateMockTrip = (skipSuggestions = false): Trip => {
        const tripId = `t-${Date.now()}`;
        const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
        const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const suggestions: (Hotel | Attraction)[] = [];

        const leg: TripLegData = {
            id: `leg-${tripId}-1`,
            title: destination || 'My Destination',
            location: destination || 'Unknown',
            startDate,
            endDate,
            hotels: [],
            arrivalTransfer: null,
            days: [
                { date: startDate, location: destination || 'Unknown', activities: [] },
                { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], location: destination || 'Unknown', activities: [] },
                { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], location: destination || 'Unknown', activities: [] }
            ],
            suggestions
        };

        return {
            id: tripId,
            name: tripName || 'New Trip',
            destination: destination || 'Unknown Destination',
            startDate,
            endDate,
            image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop',
            passengers: pax,
            vibes: selectedVibes,
            collaborators: [CURRENT_USER],
            legs: [leg],
            unscheduled: [],
            notes: [],
            documents: []
        };
    };

    const handleCreate = (skipSuggestions = false) => {
        if (!destination.trim()) {
            setStep(2);
            setTimeout(() => document.getElementById('destination')?.focus(), 100);
            return;
        }
        const newTrip = generateMockTrip(skipSuggestions);
        addTrip(newTrip);
        setOpen(false);
        router.push(`/trip/${newTrip.id}`);
    };

    const resetState = (isOpen: boolean) => {
        if (!isOpen) {
            setStep(1);
            setTripName(initialData?.destination ? `Trip to ${initialData.destination}` : '');
            setDestination(initialData?.destination || '');
            setDateRange({ from: initialData?.dateFrom ?? undefined, to: initialData?.dateTo ?? undefined });
            setPax({ infants: 0, children: 0, adults: initialData?.passengers || 1, elderly: 0 });
            setFamiliarity('');
            setSelectedVibes([]);
        }
        setOpen(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={resetState}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Trip
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                <div className="bg-primary/5 p-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Plane className="h-6 w-6 text-primary" />
                            Plan Your Trip
                        </DialogTitle>
                        <DialogDescription>
                            Let's tailor your itinerary exactly to your preferences.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Stepper */}
                    <div className="flex gap-2 mt-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-primary/20'}`} />
                        ))}
                    </div>
                </div>

                <div className="p-6 relative min-h-[400px] max-h-[60vh] overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="tripName">Trip Name</Label>
                                        <Input id="tripName" value={tripName} onChange={e => setTripName(e.target.value)} placeholder="Summer Vacation" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dates">Trip Dates</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="date"
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !dateRange && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {dateRange?.from ? (
                                                        dateRange.to ? (
                                                            <>
                                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                                {format(dateRange.to, "LLL dd, y")}
                                                            </>
                                                        ) : (
                                                            format(dateRange.from, "LLL dd, y")
                                                        )
                                                    ) : (
                                                        <span>Pick your trip dates</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={dateRange?.from}
                                                    selected={dateRange}
                                                    onSelect={setDateRange}
                                                    numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="pt-2">
                                        <Label className="mb-3 block text-base">Who is traveling?</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Adults</Label>
                                                <Input type="number" min={1} value={pax.adults} onChange={e => setPax({ ...pax, adults: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Children</Label>
                                                <Input type="number" min={0} value={pax.children} onChange={e => setPax({ ...pax, children: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Infants</Label>
                                                <Input type="number" min={0} value={pax.infants} onChange={e => setPax({ ...pax, infants: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Elderly</Label>
                                                <Input type="number" min={0} value={pax.elderly} onChange={e => setPax({ ...pax, elderly: parseInt(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="destination" className="text-base">First Destination</Label>
                                        <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Paris" />
                                    </div>

                                    {/* Familiarity selection hidden per request 
                                    <div className="pt-4">
                                        ...
                                    </div>
                                    */}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <Label className="text-base block mb-1">What's your travel vibe?</Label>
                                    <p className="text-sm text-muted-foreground mb-4">Select the activities you enjoy to help us find the perfect recommendations.</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        {VIBES.map(vibe => {
                                            const Icon = vibe.icon;
                                            const isActive = selectedVibes.includes(vibe.id);
                                            return (
                                                <button
                                                    key={vibe.id}
                                                    onClick={() => toggleVibe(vibe.id)}
                                                    className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary text-primary' : 'hover:border-primary/50 text-foreground'}`}
                                                >
                                                    <Icon className="w-8 h-8 mb-2" />
                                                    <span className="font-medium text-sm text-center">{vibe.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-6 bg-muted/50 border-t flex justify-between items-center">
                    <Button variant="ghost" className="text-muted-foreground" onClick={() => handleCreate(true)}>
                        Skip
                    </Button>
                    <div className="flex gap-2">
                        {step > 1 && (
                            <Button variant="outline" onClick={handleBack}>
                                Back
                            </Button>
                        )}
                        {step < 3 ? (
                            <Button onClick={handleNext}>
                                Next
                            </Button>
                        ) : (
                            <Button onClick={() => handleCreate(false)}>
                                Create Itinerary
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
