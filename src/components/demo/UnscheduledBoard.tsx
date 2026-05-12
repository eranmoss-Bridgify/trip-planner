'use client';

import { Attraction, Hotel } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnscheduledBoardProps {
    items: (Hotel | Attraction)[];
}

export function UnscheduledBoard({ items }: UnscheduledBoardProps) {
    return (
        <Card className="border-dashed bg-muted/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Lightbulb className="h-4 w-4" />
                    Idea Board
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length > 0 ? (
                    items.map(item => (
                        <div key={item.id} className="p-3 bg-background rounded-lg border shadow-xs flex gap-3">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded-md object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">{item.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">
                                    {(item as any).category || 'Hotel'} • {item.rating}★
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                        <p>No ideas yet.</p>
                        <Button variant="link" size="sm" className="mt-1">
                            Browse Recommendations
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
