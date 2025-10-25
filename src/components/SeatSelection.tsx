"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock, User, X, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Seat {
  id: string;
  seatNumber: string;
  seatType: "REGULAR" | "PREMIUM";
  isAvailable: boolean;
  isLocked: boolean;
  isBooked: boolean;
  price: number;
}

interface SeatSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  busInfo: {
    id: string;
    busNumber: string;
    busType: string;
    operatorName: string;
    totalSeats: number;
  };
  route: {
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
  };
  onProceedToBooking: (selectedSeats: string[], totalAmount: number) => void;
  maxPassengers: number;
}

// Mock seat data - in real app, this would come from the API
const generateSeatLayout = (totalSeats: number): Seat[] => {
  const seats: Seat[] = [];
  const seatsPerRow = 4;
  const totalRows = Math.ceil(totalSeats / seatsPerRow);

  for (let row = 1; row <= totalRows; row++) {
    const cols = ["A", "B", "C", "D"];
    for (const col of cols) {
      const seatNumber = `${row}${col}`;
      const seatType = row <= 2 ? "PREMIUM" : "REGULAR";
      const basePrice = seatType === "PREMIUM" ? 50 : 35;

      // Mock some seats as booked/locked for demo
      const isBooked = Math.random() < 0.2;
      const isLocked = !isBooked && Math.random() < 0.1;

      seats.push({
        id: `seat-${seatNumber}`,
        seatNumber,
        seatType,
        isAvailable: !isBooked && !isLocked,
        isBooked,
        isLocked,
        price: basePrice,
      });

      if (seats.length >= totalSeats) break;
    }
    if (seats.length >= totalSeats) break;
  }

  return seats;
};

export default function SeatSelection({
  isOpen,
  onClose,
  busInfo,
  route,
  onProceedToBooking,
  maxPassengers,
}: SeatSelectionProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(300); // 5 minutes
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Simulate loading seat data
      setTimeout(() => {
        setSeats(generateSeatLayout(busInfo.totalSeats));
        setIsLoading(false);
      }, 1000);

      // Reset selection when dialog opens
      setSelectedSeats([]);
      setLockTimeRemaining(300);
    }
  }, [isOpen, busInfo.totalSeats]);

  // Countdown timer for seat lock
  useEffect(() => {
    if (!isOpen || lockTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time expired - reset selection
          setSelectedSeats([]);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, lockTimeRemaining]);

  const handleSeatClick = (seatId: string, seat: Seat) => {
    if (!seat.isAvailable) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        // Deselect seat
        return prev.filter((id) => id !== seatId);
      } else if (prev.length < maxPassengers) {
        // Select seat
        return [...prev, seatId];
      }
      return prev;
    });
  };

  const getSeatClassName = (seat: Seat) => {
    const baseClasses =
      "w-8 h-8 rounded border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium";

    if (seat.isBooked) {
      return `${baseClasses} bg-red-100 border-red-300 cursor-not-allowed text-red-700`;
    }

    if (seat.isLocked) {
      return `${baseClasses} bg-yellow-100 border-yellow-300 cursor-not-allowed text-yellow-700`;
    }

    if (selectedSeats.includes(seat.id)) {
      return `${baseClasses} bg-blue-500 border-blue-600 text-white`;
    }

    if (seat.seatType === "PREMIUM") {
      return `${baseClasses} bg-purple-50 border-purple-300 hover:bg-purple-100 text-purple-700`;
    }

    return `${baseClasses} bg-green-50 border-green-300 hover:bg-green-100 text-green-700`;
  };

  const totalAmount = selectedSeats.reduce((total, seatId) => {
    const seat = seats.find((s) => s.id === seatId);
    return total + (seat?.price || 0);
  }, 0);

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes % 60);
    const secs = minutes % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleProceed = () => {
    if (selectedSeats.length > 0) {
      onProceedToBooking(selectedSeats, totalAmount);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Select Your Seats</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-orange-600">
                {formatTime(lockTimeRemaining)}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>
            Choose your preferred seats. You have 5 minutes to complete your
            selection.
          </DialogDescription>
        </DialogHeader>

        {/* Bus Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{busInfo.operatorName}</h3>
                <p className="text-sm text-gray-600">
                  {busInfo.busNumber} • {busInfo.busType}
                </p>
                <p className="text-sm text-gray-600">
                  {route.origin} → {route.destination}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Departure</p>
                <p className="font-semibold">
                  {formatDateTime(route.departureTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seat Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bus Layout</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Driver area */}
                    <div className="flex justify-center mb-6">
                      <div className="bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium">
                        🚗 Driver
                      </div>
                    </div>

                    {/* Seat grid */}
                    <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                      {seats.map((seat) => (
                        <div
                          key={seat.id}
                          className={getSeatClassName(seat)}
                          onClick={() => handleSeatClick(seat.id, seat)}
                          title={`Seat ${seat.seatNumber || "N/A"} - ${
                            seat.seatType || "Regular"
                          } (${formatCurrency(seat.price)})`}
                        >
                          {(seat.seatNumber || "N/A").slice(-1)}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 justify-center text-xs mt-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-50 border-2 border-purple-300 rounded"></div>
                        <span>Premium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded"></div>
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                        <span>Locked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                        <span>Booked</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selection Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selection Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Selected Seats ({selectedSeats.length}/{maxPassengers})
                  </p>
                  {selectedSeats.length === 0 ? (
                    <p className="text-gray-400 text-sm">No seats selected</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSeats.map((seatId) => {
                        const seat = seats.find((s) => s.id === seatId);
                        if (!seat) return null;

                        return (
                          <div
                            key={seatId}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">
                                Seat {seat.seatNumber || "N/A"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {seat.seatType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {formatCurrency(seat.price)}
                              </span>
                              <button
                                onClick={() => handleSeatClick(seatId, seat)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedSeats.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                  <p className="text-sm font-medium">Secure Selection</p>
                  <p className="text-xs text-gray-600">
                    Your seats are temporarily locked and protected from other
                    users
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Proceed to Booking ({selectedSeats.length} seat
            {selectedSeats.length !== 1 ? "s" : ""})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
