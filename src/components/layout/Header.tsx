import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plane, User, Globe } from 'lucide-react';
import { cn } from '@/lib/utils'; // Keep thisimport if needed, or remove if unused

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Plane className="h-6 w-6 -rotate-45" />
                    <span>EL AL</span>
                </Link>
                <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
                    <Link href="#" className="hover:text-primary transition-colors">Book a Flight</Link>
                    <Link href="/trips" className="text-secondary-foreground font-semibold">My Trips</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Check-in</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Flight Status</Link>
                </nav>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <Globe className="h-5 w-5" />
                        <span className="sr-only">Change Language</span>
                    </Button>
                    <Button variant="outline" className="gap-2 rounded-full border-primary/20 hover:bg-primary/5">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Ofir Cohen</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
