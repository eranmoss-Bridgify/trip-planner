'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Trip, DEFAULT_DB_STATE, TripLegData } from '@/lib/mock-data';

interface TripContextType {
    trips: Trip[];
    getTripById: (id: string) => Trip | undefined;
    addTrip: (newTrip: Trip) => void;
    updateTrip: (updatedTrip: Trip) => void;
    addLegToTrip: (tripId: string, title: string, location: string, startDate: string, endDate: string) => void;
    addServiceToLeg: (tripId: string, legId: string, service: any, type: 'Hotel' | 'Attraction', dateRange?: { checkIn: string, checkOut: string }) => void;
    moveActivity: (tripId: string, legId: string, sourceDayIndex: number, destDayIndex: number, sourceIndex: number, destIndex: number) => void;
    moveActivityToLeg: (tripId: string, sourceLegId: string, destLegId: string, sourceDayIndex: number, sourceActivityIndex: number) => void;
    removeActivity: (tripId: string, legId: string, dayIndex: number, activityIndex: number) => void;
    removeHotel: (tripId: string, legId: string, hotelIndex: number) => void;
    removeTransfer: (tripId: string, legId: string) => void;
    removeLeg: (tripId: string, legId: string) => void;
    checkoutTrip: (tripId: string) => void;
    updateItemBookingStatus: (tripId: string, legId: string, itemType: 'Hotel' | 'Attraction' | 'Transfer', status: 'planned' | 'booked' | 'booked_manual', hotelIndex?: number, dayIndex?: number, activityIndex?: number) => void;
    dismissRecommendation: (tripId: string, recommendationId: string) => void;
    dismissRecommendations: (tripId: string, recommendationIds: string[]) => void;
    isLoaded: boolean;
    removeTrip: (tripId: string) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        const storedTrips = localStorage.getItem('elalTrips');
        if (storedTrips) {
            try {
                let parsedTrips = JSON.parse(storedTrips);

                // MIGRATION: Ensure all activities have unique IDs to fix drag-and-drop key errors
                // AND: Reconcile loaded days with the startDate/endDate
                const seenIds = new Set<string>();
                parsedTrips = parsedTrips.map((trip: any) => ({
                    ...trip,
                    legs: trip.legs?.map((leg: any) => {
                        const start = new Date(leg.startDate);
                        const end = new Date(leg.endDate);
                        const newDays = [];

                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            const dateStr = d.toISOString();
                            const existingDay = leg.days?.find((day: any) => day.date.split('T')[0] === dateStr.split('T')[0]);

                            if (existingDay) {
                                newDays.push({
                                    ...existingDay,
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
                                newDays.push({
                                    date: dateStr,
                                    location: leg.location,
                                    activities: []
                                });
                            }
                        }

                        return { ...leg, days: newDays };
                    }) || []
                }));

                setTrips(parsedTrips);
            } catch (e) {
                console.error("Failed to parse trips from local storage", e);
                setTrips(DEFAULT_DB_STATE.trips);
            }
        } else {
            // First time load, use default mock data
            setTrips(DEFAULT_DB_STATE.trips);
            localStorage.setItem('elalTrips', JSON.stringify(DEFAULT_DB_STATE.trips));
        }
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage whenever trips change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('elalTrips', JSON.stringify(trips));
        }
    }, [trips, isLoaded]);

    const getTripById = (id: string) => {
        return trips.find(t => t.id === id);
    };

    const addTrip = (newTrip: Trip) => {
        setTrips(prevTrips => [newTrip, ...prevTrips]);
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
                const start = new Date(startDate);
                const end = new Date(endDate);
                const newDays = [];

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    newDays.push({
                        date: d.toISOString(),
                        location: location,
                        activities: []
                    });
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
                                updatedDays[0] = {
                                    ...updatedDays[0],
                                    activities: [...updatedDays[0].activities, { ...serviceInstance, date: updatedDays[0].date }]
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

    return (
        <TripContext.Provider value={{
            trips, getTripById, addTrip, updateTrip, addLegToTrip, addServiceToLeg, moveActivity, moveActivityToLeg, removeActivity, removeHotel, removeTransfer, removeLeg,
            checkoutTrip,
            updateItemBookingStatus,
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
