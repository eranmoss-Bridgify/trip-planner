'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Trip, DEFAULT_DB_STATE, TripLegData } from '@/lib/mock-data';

interface TripContextType {
    trips: Trip[];
    cartCount: number;
    getTripById: (id: string) => Trip | undefined;
    addTrip: (newTrip: Trip) => void;
    updateTrip: (updatedTrip: Trip) => void;
    addLegToTrip: (tripId: string, title: string, location: string, startDate: string, endDate: string) => void;
    updateLeg: (tripId: string, legId: string, updates: { title?: string; location?: string; startDate?: string; endDate?: string }) => void;
    splitLeg: (tripId: string, legId: string, splitDate: string, newCity: string) => void;
    addServiceToLeg: (tripId: string, legId: string, service: any, type: 'Hotel' | 'Attraction', dateRange?: { checkIn: string, checkOut: string }) => void;
    moveActivity: (tripId: string, legId: string, sourceDayIndex: number, destDayIndex: number, sourceIndex: number, destIndex: number) => void;
    moveActivityToLeg: (tripId: string, sourceLegId: string, destLegId: string, sourceDayIndex: number, sourceActivityIndex: number) => void;
    removeActivity: (tripId: string, legId: string, dayIndex: number, activityIndex: number) => void;
    removeHotel: (tripId: string, legId: string, hotelIndex: number) => void;
    removeTransfer: (tripId: string, legId: string) => void;
    removeLeg: (tripId: string, legId: string) => void;
    checkoutTrip: (tripId: string) => void;
    updateItemBookingStatus: (tripId: string, legId: string, itemType: 'Hotel' | 'Attraction' | 'Transfer', status: 'planned' | 'booked' | 'booked_manual', hotelIndex?: number, dayIndex?: number, activityIndex?: number) => void;
    confirmBooking: (tripId: string, legId: string, dayIndex: number, activityIndex: number, bookingReference: string) => void;
    dismissRecommendation: (tripId: string, recommendationId: string) => void;
    dismissRecommendations: (tripId: string, recommendationIds: string[]) => void;
    isLoaded: boolean;
    removeTrip: (tripId: string) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

// Strip any time/timezone component — always store dates as plain YYYY-MM-DD
function toDateOnly(s: string): string {
    return s.slice(0, 10);
}

// Add N days to a YYYY-MM-DD string using UTC arithmetic (no timezone involvement)
function addDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const ms = Date.UTC(y, m - 1, d) + n * 86400000;
    const dt = new Date(ms);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function generateDays(start: string, end: string, location: string): any[] {
    const days: any[] = [];
    for (let cur = toDateOnly(start); cur <= toDateOnly(end); cur = addDays(cur, 1))
        days.push({ date: cur, location, activities: [] });
    return days;
}

function reconcileTrips(rawTrips: any[]): any[] {
    const seenIds = new Set<string>();
    return rawTrips.map((trip: any) => ({
        ...trip,
        legs: trip.legs?.map((leg: any) => {
            const start = toDateOnly(leg.startDate);
            const end = toDateOnly(leg.endDate);
            const newDays: any[] = [];

            for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
                const existingDay = leg.days?.find((day: any) => toDateOnly(day.date) === cur);
                if (existingDay) {
                    newDays.push({
                        ...existingDay,
                        date: cur,
                        activities: existingDay.activities?.map((act: any) => {
                            let newId = act.id;
                            if (seenIds.has(newId)) {
                                newId = `${newId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                            }
                            seenIds.add(newId);
                            return { ...act, id: newId };
                        }) || []
                    });
                } else {
                    newDays.push({ date: cur, location: leg.location, activities: [] });
                }
            }

            return { ...leg, startDate: start, endDate: end, days: newDays };
        }) || []
    }));
}

export function TripProvider({ children }: { children: ReactNode }) {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const cartCount = trips.reduce((total, trip) =>
        trip.legs.reduce((lt, leg) =>
            leg.days.reduce((dt, day) =>
                dt + day.activities.filter((a: any) => a.bookingStatus === 'planned').length
            , lt)
        , total)
    , 0);

    // Load from LocalStorage on mount
    useEffect(() => {
        const storedTrips = localStorage.getItem('wandervault_trips_v2');
        if (storedTrips) {
            try {
                const parsedTrips = reconcileTrips(JSON.parse(storedTrips));
                setTrips(parsedTrips);
            } catch (e) {
                console.error("Failed to parse trips from local storage", e);
                const defaultTrips = reconcileTrips(DEFAULT_DB_STATE.trips as any[]);
                setTrips(defaultTrips as Trip[]);
            }
        } else {
            // First time load — reconcile mock data to fill all days in each leg
            const defaultTrips = reconcileTrips(DEFAULT_DB_STATE.trips as any[]);
            setTrips(defaultTrips as Trip[]);
            localStorage.setItem('wandervault_trips_v2', JSON.stringify(defaultTrips));
        }
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage whenever trips change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('wandervault_trips_v2', JSON.stringify(trips));
        }
    }, [trips, isLoaded]);

    const getTripById = (id: string) => {
        return trips.find(t => t.id === id);
    };

    const addTrip = (newTrip: Trip) => {
        const clean: Trip = {
            ...newTrip,
            legs: newTrip.legs.map(leg => ({
                ...leg,
                startDate: toDateOnly(leg.startDate),
                endDate: toDateOnly(leg.endDate),
                days: generateDays(leg.startDate, leg.endDate, leg.location),
            })),
        };
        setTrips(prevTrips => [clean, ...prevTrips]);
    };

    const updateTrip = (updatedTrip: Trip) => {
        setTrips(prevTrips =>
            prevTrips.map(t => t.id === updatedTrip.id ? updatedTrip : t)
        );
    };

    const removeTrip = (tripId: string) => {
        setTrips(prevTrips => prevTrips.filter(t => t.id !== tripId));
    };

    const addLegToTrip = (tripId: string, title: string, location: string, startDate: string, endDate: string) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id === tripId) {
                const start = toDateOnly(startDate);
                const end = toDateOnly(endDate);
                const newDays = [];

                for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
                    newDays.push({ date: cur, location, activities: [] });
                }

                const newLeg: TripLegData = {
                    id: `leg-${trip.id}-${trip.legs.length + 1}`,
                    title: title || location,
                    location,
                    startDate,
                    endDate,
                    hotels: [],
                    arrivalTransfer: null,
                    days: newDays
                };
                return { ...trip, legs: [...trip.legs, newLeg] };
            }
            return trip;
        }));
    };

    const addServiceToLeg = (tripId: string, legId: string, service: any, type: 'Hotel' | 'Attraction', dateRange?: { checkIn: string, checkOut: string }) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id === tripId) {
                // Generate a unique ID for attractions so we can add the same one multiple times
                // without breaking drag-and-drop keys
                const isAttraction = type === 'Attraction';
                const serviceInstance = isAttraction
                    ? { ...service, id: `${service.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, bookingStatus: 'planned' }
                    : { ...service, bookingStatus: 'planned' };

                const updatedLegs = trip.legs.map(leg => {
                    if (leg.id === legId) {
                        if (type === 'Hotel') {
                            const hotelEntry = {
                                hotel: serviceInstance,
                                checkIn: dateRange?.checkIn || leg.startDate,
                                checkOut: dateRange?.checkOut || leg.endDate
                            };
                            return { ...leg, hotels: [...(leg.hotels || []), hotelEntry] };
                        } else if (type === 'Attraction') {
                            if (leg.days && leg.days.length > 0) {
                                const updatedDays = [...leg.days];
                                const selectedDate = serviceInstance.selectedDate;
                                const targetIdx = selectedDate
                                    ? updatedDays.findIndex(d => d.date.split('T')[0] === selectedDate.split('T')[0])
                                    : -1;
                                const dayIdx = targetIdx >= 0 ? targetIdx : 0;
                                updatedDays[dayIdx] = {
                                    ...updatedDays[dayIdx],
                                    activities: [...updatedDays[dayIdx].activities, { ...serviceInstance, date: updatedDays[dayIdx].date }]
                                };
                                return { ...leg, days: updatedDays };
                            }
                            return leg;
                        }
                    }
                    return leg;
                });

                let updatedUnscheduled = trip.unscheduled;
                if (type === 'Attraction') {
                    const targetLeg = trip.legs.find(l => l.id === legId);
                    if (!targetLeg || !targetLeg.days || targetLeg.days.length === 0) {
                        updatedUnscheduled = [...(trip.unscheduled || []), serviceInstance];
                    }
                }

                return { ...trip, legs: updatedLegs, unscheduled: updatedUnscheduled };
            }
            return trip;
        }));
    };

    const checkoutTrip = (tripId: string) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;

            const updateStatus = (item: any) => ({ ...item, bookingStatus: 'booked' });

            const updatedLegs = trip.legs.map(leg => ({
                ...leg,
                hotels: leg.hotels.map(h => h.hotel.bookingStatus === 'planned' ? { ...h, hotel: updateStatus(h.hotel) } : h),
                arrivalTransfer: leg.arrivalTransfer && leg.arrivalTransfer.bookingStatus === 'planned'
                    ? updateStatus(leg.arrivalTransfer)
                    : leg.arrivalTransfer,
                days: leg.days.map(day => ({
                    ...day,
                    activities: day.activities.map(act => act.bookingStatus === 'planned' ? { ...updateStatus(act), date: day.date } : act)
                }))
            }));

            const updatedUnscheduled = trip.unscheduled.map(item =>
                item.bookingStatus === 'planned' ? updateStatus(item) : item
            );

            return { ...trip, legs: updatedLegs, unscheduled: updatedUnscheduled };
        }));
    };

    const moveActivity = (tripId: string, legId: string, sourceDayIndex: number, destDayIndex: number, sourceIndex: number, destIndex: number) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;

            const updatedLegs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;

                const newDays = [...leg.days];
                const sourceDay = { ...newDays[sourceDayIndex] };
                const destDay = sourceDayIndex === destDayIndex ? sourceDay : { ...newDays[destDayIndex] };

                const sourceActivities = [...sourceDay.activities];
                const destActivities = sourceDayIndex === destDayIndex ? sourceActivities : [...destDay.activities];

                const [movedActivity] = sourceActivities.splice(sourceIndex, 1);
                destActivities.splice(destIndex, 0, movedActivity);

                sourceDay.activities = sourceActivities;
                destDay.activities = destActivities;

                newDays[sourceDayIndex] = sourceDay;
                if (sourceDayIndex !== destDayIndex) {
                    newDays[destDayIndex] = destDay;
                }

                return { ...leg, days: newDays };
            });

            return { ...trip, legs: updatedLegs };
        }));
    };

    const moveActivityToLeg = (tripId: string, sourceLegId: string, destLegId: string, sourceDayIndex: number, sourceActivityIndex: number) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            if (sourceLegId === destLegId) return trip;

            let movedActivity: any = null;

            const updatedLegsWithRemoval = trip.legs.map(leg => {
                if (leg.id !== sourceLegId) return leg;

                const newDays = [...leg.days];
                const sourceDay = { ...newDays[sourceDayIndex] };
                const sourceActivities = [...sourceDay.activities];

                movedActivity = sourceActivities.splice(sourceActivityIndex, 1)[0];
                sourceDay.activities = sourceActivities;
                newDays[sourceDayIndex] = sourceDay;

                return { ...leg, days: newDays };
            });

            if (!movedActivity) return trip;

            const finalLegs = updatedLegsWithRemoval.map(leg => {
                if (leg.id !== destLegId) return leg;

                const newDays = [...leg.days];
                if (newDays.length > 0) {
                    const destDay = { ...newDays[0] };
                    destDay.activities = [...destDay.activities, movedActivity];
                    newDays[0] = destDay;
                } else {
                    newDays.push({
                        date: leg.startDate,
                        location: leg.location,
                        activities: [movedActivity]
                    });
                }

                return { ...leg, days: newDays };
            });

            return { ...trip, legs: finalLegs };
        }));
    };

    const removeActivity = (tripId: string, legId: string, dayIndex: number, activityIndex: number) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;

            const updatedLegs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;

                const newDays = [...leg.days];
                const dayToUpdate = { ...newDays[dayIndex] };
                const newActivities = [...dayToUpdate.activities];

                newActivities.splice(activityIndex, 1);
                dayToUpdate.activities = newActivities;
                newDays[dayIndex] = dayToUpdate;

                return { ...leg, days: newDays };
            });

            return { ...trip, legs: updatedLegs };
        }));
    };

    const removeHotel = (tripId: string, legId: string, hotelIndex: number) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            const updatedLegs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;
                const newHotels = [...(leg.hotels || [])];
                newHotels.splice(hotelIndex, 1);
                return { ...leg, hotels: newHotels };
            });
            return { ...trip, legs: updatedLegs };
        }));
    };

    const removeTransfer = (tripId: string, legId: string) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            const updatedLegs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;
                return { ...leg, arrivalTransfer: null };
            });
            return { ...trip, legs: updatedLegs };
        }));
    };

    const updateLeg = (tripId: string, legId: string, updates: { title?: string; location?: string; startDate?: string; endDate?: string }) => {
        setTrips(prev => prev.map(trip => {
            if (trip.id !== tripId) return trip;
            const legs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;
                const start = toDateOnly(updates.startDate ?? leg.startDate);
                const end   = toDateOnly(updates.endDate   ?? leg.endDate);
                const loc   = updates.location ?? leg.location;
                // Rebuild days spanning the new date range, preserving existing activities
                const newDays: any[] = [];
                for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
                    const existing = leg.days.find(d => d.date === cur);
                    newDays.push(existing ? { ...existing, location: loc } : { date: cur, location: loc, activities: [] });
                }
                return { ...leg, ...updates, startDate: start, endDate: end, location: loc, days: newDays };
            });
            return { ...trip, legs };
        }));
    };

    const splitLeg = (tripId: string, legId: string, splitDate: string, newCity: string) => {
        setTrips(prev => prev.map(trip => {
            if (trip.id !== tripId) return trip;
            const legIdx = trip.legs.findIndex(l => l.id === legId);
            if (legIdx === -1) return trip;
            const leg = trip.legs[legIdx];

            const before = leg.days.filter(d => d.date < splitDate);
            const after  = leg.days.filter(d => d.date >= splitDate);
            if (before.length === 0 || after.length === 0) return trip;

            const trimmedLeg = {
                ...leg,
                endDate: before[before.length - 1].date,
                days: before,
            };
            const newLeg: TripLegData = {
                id: `leg-${trip.id}-${Date.now()}`,
                title: newCity,
                location: newCity,
                startDate: after[0].date,
                endDate: after[after.length - 1].date,
                hotels: [],
                arrivalTransfer: null,
                days: after.map(d => ({ ...d, location: newCity })),
            };
            const newLegs = [...trip.legs];
            newLegs[legIdx] = trimmedLeg;
            newLegs.splice(legIdx + 1, 0, newLeg);
            return { ...trip, legs: newLegs };
        }));
    };

    const removeLeg = (tripId: string, legId: string) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            const updatedLegs = trip.legs.filter(leg => leg.id !== legId);
            return { ...trip, legs: updatedLegs };
        }));
    };

    const updateItemBookingStatus = (tripId: string, legId: string, itemType: 'Hotel' | 'Attraction' | 'Transfer', status: 'planned' | 'booked' | 'booked_manual', hotelIndex?: number, dayIndex?: number, activityIndex?: number) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;

            const updatedLegs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;

                if (itemType === 'Hotel' && hotelIndex !== undefined) {
                    const newHotels = [...(leg.hotels || [])];
                    if (newHotels[hotelIndex]) {
                        newHotels[hotelIndex] = {
                            ...newHotels[hotelIndex],
                            hotel: { ...newHotels[hotelIndex].hotel, bookingStatus: status }
                        };
                    }
                    return { ...leg, hotels: newHotels };
                } else if (itemType === 'Transfer' && leg.arrivalTransfer) {
                    return {
                        ...leg,
                        arrivalTransfer: { ...leg.arrivalTransfer, bookingStatus: status }
                    };
                } else if (itemType === 'Attraction' && dayIndex !== undefined && activityIndex !== undefined) {
                    const newDays = [...(leg.days || [])];
                    if (newDays[dayIndex]) {
                        const newActivities = [...(newDays[dayIndex].activities || [])];
                        if (newActivities[activityIndex]) {
                            newActivities[activityIndex] = {
                                ...newActivities[activityIndex],
                                bookingStatus: status,
                                // Stamp the current day date so we can warn if dragged to wrong day
                                date: (status === 'booked_manual' || status === 'booked') ? newDays[dayIndex].date : (newActivities[activityIndex] as any).date
                            };
                            newDays[dayIndex] = { ...newDays[dayIndex], activities: newActivities };
                        }
                    }
                    return { ...leg, days: newDays };
                }

                return leg;
            });

            return { ...trip, legs: updatedLegs };
        }));
    };

    const dismissRecommendation = (tripId: string, recommendationId: string) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            const newDismissed = [...(trip.dismissedRecommendations || []), recommendationId];
            return { ...trip, dismissedRecommendations: newDismissed };
        }));
    };

    const dismissRecommendations = (tripId: string, recommendationIds: string[]) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            const newDismissed = [...(trip.dismissedRecommendations || []), ...recommendationIds];
            return { ...trip, dismissedRecommendations: newDismissed };
        }));
    };

    const confirmBooking = (tripId: string, legId: string, dayIndex: number, activityIndex: number, bookingReference: string) => {
        setTrips(prevTrips => prevTrips.map(trip => {
            if (trip.id !== tripId) return trip;
            const legs = trip.legs.map(leg => {
                if (leg.id !== legId) return leg;
                const days = leg.days.map((day, di) => {
                    if (di !== dayIndex) return day;
                    const activities = day.activities.map((act: any, ai: number) => {
                        if (ai !== activityIndex) return act;
                        return { ...act, bookingStatus: 'booked', bookingReference };
                    });
                    return { ...day, activities };
                });
                return { ...leg, days };
            });
            return { ...trip, legs };
        }));
    };

    return (
        <TripContext.Provider value={{
            trips, cartCount, getTripById, addTrip, updateTrip, addLegToTrip, updateLeg, splitLeg, addServiceToLeg, moveActivity, moveActivityToLeg, removeActivity, removeHotel, removeTransfer, removeLeg,
            checkoutTrip,
            updateItemBookingStatus,
            confirmBooking,
            dismissRecommendation,
            dismissRecommendations,
            isLoaded,
            removeTrip,
        }}>
            {children}
        </TripContext.Provider>
    );
}

export function useTrips() {
    const context = useContext(TripContext);
    if (context === undefined) {
        throw new Error('useTrips must be used within a TripProvider');
    }
    return context;
}
