import { Plus, X, Star, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Attraction } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
    item: Hotel | Attraction;
    onDismiss: (id: string) => void;
    onClick: (item: Hotel | Attraction) => void;
}

export function RecommendationCard({ item, onDismiss, onClick }: RecommendationCardProps) {
    const isHotel = !('category' in item);

    return (
        <Card
            className="flex flex-col min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px] overflow-hidden group cursor-pointer hover:shadow-md transition-all relative border-muted-foreground/20"
            onClick={() => onClick(item)}
        >
            {/* Dismiss Button */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(item.id);
                }}
            >
                <X className="h-3 w-3" />
            </Button>

            {/* Thumbnail */}
            <div className="h-[120px] w-full bg-muted relative overflow-hidden">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Content - Minimal Design */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <h5 className="font-semibold text-xs leading-tight line-clamp-2" title={item.name}>
                    {item.name}
                </h5>

                <div className="mt-auto flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{item.rating}</span>
                        {isHotel && <span className="text-muted-foreground ml-1">({item.rating} Star)</span>}
                    </div>

                    <div className="text-[11px] font-semibold">
                        <span className="text-muted-foreground font-normal">From </span>
                        {item.price} {item.currency}
                    </div>
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs h-7 mt-2 gap-1 bg-primary/5 hover:bg-primary/10 text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Trigger onClick meaning default add action / open details to add
                        onClick(item);
                    }}
                >
                    <Plus className="h-3 w-3" /> Add
                </Button>
            </div>
        </Card>
    );
}
