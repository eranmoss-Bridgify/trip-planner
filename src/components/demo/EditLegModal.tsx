'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { TripLegData } from '@/lib/mock-data';
import { ArrowRight, Scissors } from 'lucide-react';

interface EditLegModalProps {
    isOpen: boolean;
    onClose: () => void;
    leg: TripLegData;
    isNew?: boolean;
    onUpdate: (updates: { title?: string; location?: string; startDate?: string; endDate?: string }) => void;
    onSplit: (splitDate: string, newCity: string) => void;
}

function fmt(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function EditLegModal({ isOpen, onClose, leg, isNew, onUpdate, onSplit }: EditLegModalProps) {
    const [title, setTitle]         = useState(leg.title);
    const [location, setLocation]   = useState(leg.location);
    const [startDate, setStartDate] = useState(leg.startDate);
    const [endDate, setEndDate]     = useState(leg.endDate);

    const [splitDate, setSplitDate] = useState('');
    const [newCity, setNewCity]     = useState('');

    // Reset when leg changes
    useEffect(() => {
        setTitle(leg.title);
        setLocation(leg.location);
        setStartDate(leg.startDate);
        setEndDate(leg.endDate);
        setSplitDate('');
        setNewCity('');
    }, [leg]);

    const handleSave = () => {
        onUpdate({ title, location, startDate, endDate });
        onClose();
    };

    const handleSplit = () => {
        if (!splitDate || !newCity.trim()) return;
        onSplit(splitDate, newCity.trim());
        onClose();
    };

    // Days available for split (day after start up to last day)
    const splitMin = (() => {
        const [y, m, d] = startDate.split('-').map(Number);
        const next = new Date(y, m - 1, d + 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    })();

    const canSplit = leg.days.length >= 2;

    // Preview: what each part will look like after split
    const splitPreview = splitDate ? {
        partA: { city: location, from: startDate, to: leg.days.filter(d => d.date < splitDate).slice(-1)[0]?.date ?? '' },
        partB: { city: newCity || '?', from: splitDate, to: endDate },
    } : null;

    return (
        <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isNew ? 'Add destination' : 'Edit destination'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {/* Edit fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Barcelona Stay" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">City</Label>
                            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Barcelona" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Start date</Label>
                            <Input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">End date</Label>
                            <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <Button className="w-full" onClick={handleSave}>
                        {isNew ? 'Add destination' : 'Save changes'}
                    </Button>

                    {!isNew && canSplit && (
                        <>
                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Scissors className="h-4 w-4 text-muted-foreground" />
                                    Split into two destinations
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Choose the date where the second city begins, then name it.
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Second city starts on</Label>
                                        <Input
                                            type="date"
                                            value={splitDate}
                                            min={splitMin}
                                            max={endDate}
                                            onChange={e => setSplitDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Second city name</Label>
                                        <Input
                                            value={newCity}
                                            onChange={e => setNewCity(e.target.value)}
                                            placeholder="e.g. Sitges"
                                        />
                                    </div>
                                </div>

                                {/* Preview */}
                                {splitPreview && splitPreview.partA.to && (
                                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                                        <div className="text-center">
                                            <p className="font-semibold">{splitPreview.partA.city}</p>
                                            <p className="text-muted-foreground">{fmt(splitPreview.partA.from)} – {fmt(splitPreview.partA.to)}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="text-center">
                                            <p className="font-semibold">{splitPreview.partB.city}</p>
                                            <p className="text-muted-foreground">{fmt(splitPreview.partB.from)} – {fmt(splitPreview.partB.to)}</p>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={handleSplit}
                                    disabled={!splitDate || !newCity.trim()}
                                >
                                    <Scissors className="h-4 w-4" />
                                    Split destination
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
