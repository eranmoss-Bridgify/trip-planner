import Link from 'next/link';

export function Footer() {
    return (
        <footer className="w-full border-t bg-muted/40 py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 md:px-6">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    © 2026 Demo Co. All rights reserved.
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <Link href="#" className="hover:underline">Privacy Policy</Link>
                    <Link href="#" className="hover:underline">Terms of Service</Link>
                    <Link href="#" className="hover:underline">Accessibility</Link>
                </div>
            </div>
        </footer>
    );
}
