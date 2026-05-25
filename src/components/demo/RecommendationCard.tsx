import { Plus, X, Star, Clock, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hotel, Attraction } from '@/lib/mock-data';
import { fmtPrice } from '@/lib/utils';

interface RecommendationCardProps {
    item: Hotel | Attraction;
    onDismiss: (id: string) => void;
    onClick: (item: Hotel | Attraction) => void;
}

export function RecommendationCard({ item, onDismiss, onClick }: RecommendationCardProps) {
    const isHotel = !('category' in item);
    const attraction = item as any;

    return (
        <Card
            className="flex flex-col min-w-[220px] w-[220px] sm:min-w-[240px] sm:w-[240px] overflow-hidden group cursor-pointer hover:shadow-md transition-all relative border-muted-foreground/20"
            onClick={() => onClick(item)}
        >
            {/* Dismiss Button */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 hover:bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(item.id);
                }}
            >
                <X className="h-3 w-3" />
            </Button>

            {/* Thumbnail */}
            <div className="h-[152px] w-full bg-muted relative overflow-hidden shrink-0">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Best Seller — top left */}
                {!isHotel && attraction.isBestSeller && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0 gap-1 text-[10px] px-1.5 py-0.5">
                        <Award className="h-2.5 w-2.5" /> Best Seller
                    </Badge>
                )}
                {/* Hotel stars — top left */}
                {isHotel && (item as any).starRating > 0 && (
                    <div className="absolute top-2 left-2 flex gap-0.5">
                        {Array.from({ length: (item as any).starRating }).map((_: unknown, i: number) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                )}
                {/* Category — bottom right */}
                <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground backdrop-blur text-[10px] px-1.5 py-0">
                    {isHotel ? 'Hotel' : (attraction.category || 'Experience')}
                </Badge>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col gap-2 flex-1">
                <h5 className="font-semibold text-sm leading-tight line-clamp-2" title={item.name}>
                    {item.name}
                </h5>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1">
                    {!isHotel && attraction.duration && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-muted-foreground">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {attraction.duration}
                        </Badge>
                    )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        {item.rating > 0 && (
                            <>
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                <span>{item.rating}</span>
                            </>
                        )}
                    </div>
                    <div className="text-xs font-semibold text-primary">
                        {item.price > 0 ? (
                            <><span className="text-muted-foreground font-normal text-[10px]">From </span>{fmtPrice(item.price, item.currency)}</>
                        ) : null}
                    </div>
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs h-7 gap-1 bg-primary/5 hover:bg-primary/10 text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick(item);
                    }}
                >
                    <Plus className="h-3 w-3" /> Add to itinerary
                </Button>
            </div>
        </Card>
    );
}
