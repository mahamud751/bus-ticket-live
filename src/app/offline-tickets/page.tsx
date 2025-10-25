"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Share2,
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  MapPin,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

interface OfflineBooking {
  id: string;
  pnr: string;
  status: string;
  totalAmount: number;
  passengerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
    route: {
      origin: string;
      destination: string;
    };
    operator: string;
    busNumber: string;
  };
  seats: Array<{
    seatNumber: string;
    seatType: string;
  }>;
  qrCode: string;
  syncStatus: "synced" | "pending" | "error";
}

export default function OfflineBookingsPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [bookings, setBookings] = useState<OfflineBooking[]>([]);
  const [syncingBookings, setSyncingBookings] = useState<string[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    loadOfflineBookings();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadOfflineBookings = () => {
    try {
      const storedBookings = localStorage.getItem("offline-bookings");
      if (storedBookings) {
        setBookings(JSON.parse(storedBookings));
      }
    } catch (error) {
      console.error("Error loading offline bookings:", error);
    }
  };

  const saveOfflineBookings = (updatedBookings: OfflineBooking[]) => {
    try {
      localStorage.setItem("offline-bookings", JSON.stringify(updatedBookings));
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Error saving offline bookings:", error);
    }
  };

  const syncBooking = async (bookingId: string) => {
    if (!isOnline) {
      toast.error("No internet connection");
      return;
    }

    setSyncingBookings((prev) => [...prev, bookingId]);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/sync`, {
        method: "POST",
      });

      if (response.ok) {
        const updatedBookings = bookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, syncStatus: "synced" as const }
            : booking
        );
        saveOfflineBookings(updatedBookings);
        toast.success("Booking synced successfully");
      } else {
        throw new Error("Sync failed");
      }
    } catch (error) {
      console.error("Sync error:", error);
      const updatedBookings = bookings.map((booking) =>
        booking.id === bookingId
          ? { ...booking, syncStatus: "error" as const }
          : booking
      );
      saveOfflineBookings(updatedBookings);
      toast.error("Failed to sync booking");
    } finally {
      setSyncingBookings((prev) => prev.filter((id) => id !== bookingId));
    }
  };

  const downloadTicket = (booking: OfflineBooking) => {
    const ticketText = `
DIGITAL TICKET - ${booking.pnr}
${booking.schedule.operator}
${booking.schedule.route.origin} → ${booking.schedule.route.destination}
Departure: ${new Date(booking.schedule.departureTime).toLocaleString()}
Passenger: ${booking.passengerInfo.name}
Seats: ${booking.seats.map((s) => s.seatNumber).join(", ")}
Amount: $${booking.totalAmount}
Status: ${booking.status}
    `;

    const blob = new Blob([ticketText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${booking.pnr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Ticket downloaded");
  };

  const shareBooking = async (booking: OfflineBooking) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bus Ticket - ${booking.pnr}`,
          text: `${booking.schedule.route.origin} to ${
            booking.schedule.route.destination
          } on ${new Date(
            booking.schedule.departureTime
          ).toLocaleDateString()}`,
          url: window.location.origin + `/booking/confirmation/${booking.pnr}`,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      const shareText = `Bus Ticket ${booking.pnr}: ${booking.schedule.route.origin} to ${booking.schedule.route.destination}`;
      navigator.clipboard.writeText(shareText);
      toast.success("Booking details copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Offline Tickets
          </h1>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Badge className="bg-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Offline Ticket Access
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your tickets are saved locally and can be accessed without
                  internet.
                  {!isOnline && " Connect to internet to sync latest updates."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Offline Tickets
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your tickets will be automatically saved for offline access
                  after booking.
                </p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {booking.schedule.route.origin} →{" "}
                          {booking.schedule.route.destination}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {booking.schedule.operator} • Bus{" "}
                          {booking.schedule.busNumber}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            booking.syncStatus === "synced"
                              ? "default"
                              : booking.syncStatus === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {booking.syncStatus === "synced" && "Synced"}
                          {booking.syncStatus === "pending" && "Pending"}
                          {booking.syncStatus === "error" && "Sync Error"}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          {booking.pnr}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">
                            {new Date(
                              booking.schedule.departureTime
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {new Date(
                              booking.schedule.departureTime
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">
                            {booking.passengerInfo.name}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {booking.passengerInfo.phone}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">
                            Seats:{" "}
                            {booking.seats.map((s) => s.seatNumber).join(", ")}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Amount: ${booking.totalAmount}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <div className="w-32 h-32 bg-white dark:bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <QrCode className="h-16 w-16 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Show this QR code to bus staff
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTicket(booking)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareBooking(booking)}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>

                      {booking.syncStatus !== "synced" && isOnline && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncBooking(booking.id)}
                          disabled={syncingBookings.includes(booking.id)}
                        >
                          {syncingBookings.includes(booking.id) ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Sync
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
