"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Wifi, Car, Coffee, Zap } from "lucide-react";
import { formatDistance } from "@/lib/utils";

interface BusRoute {
  id: string;
  route: {
    origin: { code: string; name: string };
    destination: { code: string; name: string };
    distance: number;
    duration: number;
  };
  operator: {
    id: string;
    name: string;
  };
  bus: {
    id: string;
    busNumber: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
    duration: number;
  };
  availability: {
    totalSeats: number;
    availableSeats: number;
    bookedSeats: number;
  };
  pricing: {
    regular: number;
    premium: number;
    currency: string;
  };
}

interface SearchResultsProps {
  searchParams: {
    origin: string;
    destination: string;
    departureDate: string;
    passengers: number;
  };
  onSelectBus: (route: BusRoute) => void;
}

const amenityIcons = {
  AC: <Car className="h-4 w-4" />,
  WiFi: <Wifi className="h-4 w-4" />,
  USB_Charging: <Zap className="h-4 w-4" />,
  Restroom: <Coffee className="h-4 w-4" />,
};

export default function SearchResults({
  searchParams,
  onSelectBus,
}: SearchResultsProps) {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureDate: searchParams.departureDate,
          passengers: searchParams.passengers.toString(),
        });

        const response = await fetch(`/api/routes/search?${params}`);
        const data = await response.json();

        if (data.success) {
          setRoutes(data.data.results);
        } else {
          setError(data.error || "Failed to fetch routes");
        }
      } catch (err) {
        setError("Network error occurred");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (
      searchParams.origin &&
      searchParams.destination &&
      searchParams.departureDate
    ) {
      fetchRoutes();
    }
  }, [searchParams]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getBusTypeColor = (busType: string) => {
    switch (busType) {
      case "LUXURY":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700";
      case "AC":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700";
      case "NON_AC":
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
      case "SLEEPER":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-6 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                </div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="flex space-x-4">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">⚠️ Error</div>
          <p className="text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (routes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-6xl mb-4">🚌</div>
          <h3 className="text-lg font-semibold mb-2">No buses found</h3>
          <p className="text-muted-foreground">
            No buses are available for the selected route and date. Try
            searching for a different date or route.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {routes.length} bus{routes.length !== 1 ? "es" : ""} found
        </h2>
        <div className="text-sm text-muted-foreground">
          {searchParams.origin} → {searchParams.destination}
        </div>
      </div>

      {routes.map((route) => (
        <Card
          key={route.id}
          className="hover:shadow-lg transition-shadow duration-200"
        >
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Bus Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {route.operator.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getBusTypeColor(route.bus.busType)}>
                        {route.bus.busType.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {route.bus.busNumber}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ৳{route.pricing.regular}
                    </div>
                    <div className="text-sm text-gray-600">per seat</div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {formatTime(route.schedule.departureTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {route.route.origin.name}
                      </div>
                    </div>

                    <div className="flex items-center text-muted-foreground">
                      <div className="border-t border-border w-12"></div>
                      <Clock className="h-4 w-4 mx-2" />
                      <div className="border-t border-border w-12"></div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {formatTime(route.schedule.arrivalTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {route.route.destination.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {formatDuration(route.schedule.duration)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistance(route.route.distance || 0)} km
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(route.bus.amenities || []).map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                      >
                        {amenityIcons[amenity as keyof typeof amenityIcons]}
                        {amenity.replace("_", " ")}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {route.availability.availableSeats}
                      </span>
                      <span className="text-muted-foreground">seats left</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="lg:w-auto">
                <Button
                  onClick={() => onSelectBus(route)}
                  disabled={
                    route.availability.availableSeats < searchParams.passengers
                  }
                  className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {route.availability.availableSeats < searchParams.passengers
                    ? "Not enough seats"
                    : "Select Seats"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
