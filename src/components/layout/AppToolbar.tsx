'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ShoppingCart, Search, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrips } from '@/context/TripContext';
import { UserMenu } from '@/components/auth/UserMenu';

export function AppToolbar() {
    const { cartCount } = useTrips();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hide on root (redirect gate), /demo (airline owns the chrome), and embed mode
    if (pathname === '/' || pathname === '/demo') return null;
    if (searchParams.get('embed') === '1') return null;

    return (
        <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container flex h-11 items-center justify-between px-4 md:px-6">
                <Link href="/trips" className="flex items-center">
                    <img src="/bridgify-logo.png" alt="Bridgify" className="h-7 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </Link>

                <div className="flex items-center gap-1">
                    <Button variant={pathname === '/trips' || pathname.startsWith('/trip/') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-sm" asChild>
                        <Link href="/trips">
                            <Map className="h-4 w-4" />
                            <span className="hidden sm:inline">My Trips</span>
                        </Link>
                    </Button>

                    <Button variant={pathname === '/marketplace' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-sm" asChild>
                        <Link href="/marketplace">
                            <Search className="h-4 w-4" />
                            <span className="hidden sm:inline">Explore</span>
                        </Link>
                    </Button>

                    <Button variant={pathname === '/cart' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-sm relative" asChild>
                        <Link href="/cart">
                            <ShoppingCart className="h-4 w-4" />
                            <span className="hidden sm:inline">Cart</span>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </Link>
                    </Button>

                    <div className="ml-1 pl-1 border-l">
                        <UserMenu />
                    </div>
                </div>
            </div>
        </div>
    );
}
