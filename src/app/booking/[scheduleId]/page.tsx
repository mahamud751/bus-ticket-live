"use client";

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import BookingSeatSelection from "@/components/BookingSeatSelection";

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scheduleId = params?.scheduleId as string;
  const passengers = parseInt(searchParams?.get("passengers") || "1");

  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  );

  const handleBookingComplete = (bookingData: { booking: { id: string } }) => {
    router.push(`/payment/${bookingData.booking.id}`);
  };

  const handleBackToSearch = () => {
    router.back();
  };

  if (!scheduleId) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Invalid Booking Request
            </h1>
            <p className="text-muted-foreground mb-8">
              The schedule ID is missing or invalid.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={handleBackToSearch}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center"
          >
            ← Back to Search Results
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            Select Your Seats
          </h1>
          <p className="text-muted-foreground">
            Choose {passengers} seat{passengers !== 1 ? "s" : ""} for your
            journey
          </p>
        </div>

        <BookingSeatSelection
          scheduleId={scheduleId}
          passengers={passengers}
          sessionId={sessionId}
          onBookingComplete={handleBookingComplete}
        />
      </div>
    </main>
  );
}
