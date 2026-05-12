import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { MapPin, Calendar as CalendarIcon } from 'lucide-react';

interface AddLegModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddLeg: (title: string, locationName: string, startDate: string, endDate: string) => void;
    defaultStartDate?: string;
}

export function AddLegModal({ isOpen, onClose, onAddLeg, defaultStartDate }: AddLegModalProps) {
    const [title, setTitle] = useState('');
    const [locationName, setLocationName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setLocationName('');
            let startD = new Date();
            if (defaultStartDate) {
                startD = new Date(defaultStartDate);
            }
            const endD = new Date(startD);
            endD.setDate(endD.getDate() + 3);

            setStartDate(startD.toISOString().split('T')[0]);
            setEndDate(endD.toISOString().split('T')[0]);
        }
    }, [isOpen, defaultStartDate]);

    const handleSave = () => {
        if (!locationName.trim()) return;

        // Ensure dates are valid strings
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date();
        end.setDate(end.getDate() + 3); // Fallback if no end date selected

        onAddLeg(
            title.trim() || locationName.trim(),
            locationName.trim(),
            start.toISOString(),
            end.toISOString()
        );

        // Reset state for next time
        setTitle('');
        setLocationName('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Add New Destination
                    </DialogTitle>
                    <DialogDescription>
                        Where are you heading next? Add a new leg to your itinerary.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Leg Title (Optional)
                        </label>
                        <Input
                            id="title"
                            placeholder="e.g. Paris Stop, Weekend Getaway"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="location" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Destination City
                        </label>
                        <Input
                            id="location"
                            placeholder="e.g. Paris, Tokyo, New York"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="startDate" className="text-sm font-medium leading-none flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" /> Start Date
                            </label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="endDate" className="text-sm font-medium leading-none flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" /> End Date
                            </label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={!locationName.trim()}>Save adding destination</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
