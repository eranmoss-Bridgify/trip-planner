import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppToolbar } from "@/components/layout/AppToolbar";
import { TripProvider } from "@/context/TripContext";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Demo Co Trip Planner",
  description: "Plan your perfect trip with Demo Co",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-muted/20`}
      >
        <AuthProvider>
          <TripProvider>
            {/* AppToolbar uses useSearchParams() — Suspense keeps static prerendering working */}
            <Suspense fallback={null}>
              <AppToolbar />
            </Suspense>
            <main className="flex-1">
              {children}
            </main>
          </TripProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
