import * as React from "react";
import { Hotel, Attraction } from "@/lib/mock-data";
import { RecommendationCard } from "./RecommendationCard";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecommendationCarouselProps {
    title: string;
    items: (Hotel | Attraction)[];
    onDismiss: (id: string) => void;
    onDismissAll?: (ids: string[]) => void;
    onClick: (item: Hotel | Attraction) => void;
}

export function RecommendationCarousel({ title, items, onDismiss, onDismissAll, onClick }: RecommendationCarouselProps) {
    if (!items || items.length === 0) return null;

    return (
        <div className="w-full py-4 relative group">
            <div className="flex items-center justify-between xl:mr-12 mb-3">
                <div className="flex items-center gap-2 text-primary font-medium">
                    <Sparkles className="h-4 w-4" />
                    <h4 className="text-sm">{title}</h4>
                </div>
            </div>

            <div className="px-1 relative">
                <Carousel
                    opts={{
                        align: "start",
                        loop: false,
                        dragFree: true
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {items.map((item) => (
                            <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-auto">
                                <RecommendationCard
                                    item={item}
                                    onDismiss={onDismiss}
                                    onClick={onClick}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {items.length > 2 && (
                        <>
                            <CarouselPrevious className="left-2 bg-background/90 backdrop-blur-sm border-muted-foreground/20 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0" />
                            <CarouselNext className="right-2 bg-background/90 backdrop-blur-sm border-muted-foreground/20 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0" />
                        </>
                    )}
                </Carousel>
            </div>
            {onDismissAll && (
                <div className="flex justify-end pr-4 mt-2">
                    <Button variant="link" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-auto p-0" onClick={() => onDismissAll(items.map(i => i.id))}>
                        Clear recommendations
                    </Button>
                </div>
            )}
        </div>
    );
}
