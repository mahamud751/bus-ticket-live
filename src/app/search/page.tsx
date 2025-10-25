"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchResults from "@/components/SearchResults";
import Header from "@/components/Header";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const params = {
    origin: searchParams?.get("origin") || "",
    destination: searchParams?.get("destination") || "",
    departureDate: searchParams?.get("departureDate") || "",
    passengers: parseInt(searchParams?.get("passengers") || "1"),
  };

  const handleSelectBus = (route: { id: string }) => {
    router.push(`/booking/${route.id}?passengers=${params.passengers}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Search Results</h1>
        <p className="text-muted-foreground">
          {params.origin} to {params.destination} on {params.departureDate}
        </p>
      </div>
      <SearchResults searchParams={params} onSelectBus={handleSelectBus} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchContent />
      </Suspense>
    </main>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border p-6 rounded-lg shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
                <div className="h-10 bg-muted rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
