"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Clock,
  User,
  X,
  CheckCircle,
  MapPin,
  Calendar,
  Users,
  CreditCard,
  Loader2,
  LogIn,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatDistance, formatCurrency } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Socket event interfaces
interface SocketEventData {
  sessionId: string;
  seatIds: string[];
  [key: string]: unknown;
}

interface Seat {
  id: string;
  seatNumber: string;
  seatType: "REGULAR" | "PREMIUM" | "SLEEPER";
  price: number;
  status: "available" | "booked" | "locked" | "unavailable";
  isSelectable: boolean;
  lockInfo?: {
    expiresAt: string;
    sessionId: string;
  };
}

interface Schedule {
  id: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  route: {
    origin: { name: string; code: string };
    destination: { name: string; code: string };
    duration: number;
    distance: number;
  };
  operator: { name: string };
  bus: {
    busNumber: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
}

interface SeatSelectionProps {
  scheduleId: string;
  passengers: number;
  sessionId: string;
  onBookingComplete: (bookingData: { booking: { id: string } }) => void;
}

export default function BookingSeatSelection({
  scheduleId,
  passengers,
  sessionId,
  onBookingComplete,
}: SeatSelectionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatMap, setSeatMap] = useState<{ [key: string]: Seat[] }>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(
    null
  );
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Socket.io connection
  const { emit, on, off } = useSocket(scheduleId);

  // Contact info (shared for all passengers)
  const [contactInfo, setContactInfo] = useState({
    phone: "",
    email: "",
  });

  // Individual passenger names for each seat
  const [passengerNames, setPassengerNames] = useState<{
    [seatId: string]: string;
  }>({});

  // Fetch seat map data
  const fetchSeatMap = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/schedules/${scheduleId}/seats`);
      const data = await response.json();

      if (data.success) {
        setSchedule(data.data.schedule);
        setSeats(data.data.seats);
        setSeatMap(data.data.seatMap);
      } else {
        toast.error(data.error || "Failed to load seat map");
      }
    } catch (error) {
      console.error("Error fetching seat map:", error);
      toast.error("Failed to load seat map");
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId]);

  // Check for existing locks on component mount
  const checkExistingLocks = useCallback(async () => {
    try {
      // Check if there's a previous session stored in localStorage
      const storedSession = localStorage.getItem(
        `seat_lock_session_${scheduleId}`
      );
      if (storedSession) {
        const {
          sessionId: prevSessionId,
          seatIds,
          expiresAt,
        } = JSON.parse(storedSession);
        setPreviousSessionId(prevSessionId);

        // Check if the lock is still valid
        const now = new Date().getTime();
        const expirationTime = new Date(expiresAt).getTime();

        if (now < expirationTime) {
          // Lock is still valid, restore selection
          setSelectedSeats(seatIds);
          const timeRemaining = Math.floor((expirationTime - now) / 1000);
          setLockTimeRemaining(timeRemaining);

          // Update passenger names from localStorage if available
          const storedNames = localStorage.getItem(
            `passenger_names_${scheduleId}`
          );
          if (storedNames) {
            setPassengerNames(JSON.parse(storedNames));
          }

          // Update contact info from localStorage if available
          const storedContact = localStorage.getItem(
            `contact_info_${scheduleId}`
          );
          if (storedContact) {
            setContactInfo(JSON.parse(storedContact));
          }

          toast.success(
            `Restored ${seatIds.length} previously selected seat${
              seatIds.length !== 1 ? "s" : ""
            }`
          );
        } else {
          // Lock has expired, clean up
          localStorage.removeItem(`seat_lock_session_${scheduleId}`);
          localStorage.removeItem(`passenger_names_${scheduleId}`);
          localStorage.removeItem(`contact_info_${scheduleId}`);
        }
      }
    } catch (error) {
      console.error("Error checking existing locks:", error);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (scheduleId) {
      fetchSeatMap();
      checkExistingLocks();
    }
  }, [scheduleId, fetchSeatMap, checkExistingLocks]);

  // Lock timer countdown
  useEffect(() => {
    if (lockTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time expired - clear selection
          setSelectedSeats([]);
          localStorage.removeItem(`seat_lock_session_${scheduleId}`);
          toast.error("Seat locks expired. Please select seats again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockTimeRemaining, scheduleId]);

  // Socket.io event listeners
  useEffect(() => {
    // Listen for real-time seat lock events
    on("seats-being-locked", (...args) => {
      const data = args[0] as SocketEventData;
      if (data.sessionId !== sessionId) {
        console.log("Other user is locking seats:", data);
        // Visual feedback - just refresh seat map
        fetchSeatMap();
      }
    });

    on("seats-locked", (...args) => {
      const data = args[0] as SocketEventData;
      if (data.sessionId !== sessionId) {
        console.log("Other user locked seats:", data);
        // Refresh seat map to show new locks
        fetchSeatMap();
      }
    });

    on("seats-unlocked", (...args) => {
      const data = args[0] as SocketEventData;
      console.log("Seat(s) unlocked:", data);
      // Refresh seat map when seats are unlocked
      // This will show seats as available immediately
      fetchSeatMap()
        .then(() => {
          console.log("Seat map refreshed after unlock event");
        })
        .catch((error) => {
          console.error("Error refreshing seat map:", error);
        });

      // Show notification if it's not our own unlock event
      if (data.sessionId !== sessionId) {
        const seatCount = data.seatIds
          ? data.seatIds.length
          : data.seatId
          ? 1
          : 0;
        if (seatCount > 0) {
          toast(
            `${seatCount} seat${
              seatCount !== 1 ? "s" : ""
            } just became available!`
          );
        }
      } else {
        // Even for our own unlock events, we should refresh to ensure UI consistency
        console.log("Own seat unlocked, refreshing seat map");
      }
    });

    on("seats-booked", (...args) => {
      const data = args[0] as SocketEventData;
      console.log("Seat(s) booked:", data);
      // Refresh seat map when someone completes booking
      fetchSeatMap();
      toast(
        `${data.seatIds.length} seat${
          data.seatIds.length !== 1 ? "s" : ""
        } just got booked!`
      );
    });

    return () => {
      off("seats-being-locked");
      off("seats-locked");
      off("seats-unlocked");
      off("seats-booked");
    };
  }, [on, off, sessionId, fetchSeatMap]);

  const handleSeatClick = async (seatId: string) => {
    // Check if user is authenticated
    if (status !== "authenticated") {
      setShowLoginModal(true);
      return;
    }

    const seat = seats.find((s) => s.id === seatId);
    console.log("Seat clicked:", seatId, seat); // Debug log
    console.log("Current selected seats:", selectedSeats); // Debug log

    if (!seat) {
      console.log("Seat not found");
      toast.error("Seat not found");
      return;
    }

    // Check if seat is selectable (but allow deselecting already selected seats)
    const isCurrentlySelected = selectedSeats.includes(seatId);
    if (!seat.isSelectable && !isCurrentlySelected) {
      console.log("Seat is not selectable:", seat.status);
      toast.error(`Seat ${seat.seatNumber} is not available for selection`);
      return;
    }

    // Prevent clicking during loading
    if (isLocking) {
      console.log("Locking in progress, preventing click");
      toast.error("Please wait while we process your previous selection");
      return;
    }

    if (isCurrentlySelected) {
      console.log("Deselecting seat:", seatId);
      toast.success(`Deselecting seat ${seat.seatNumber}`);
      // Immediately deselect seat - remove from current selection
      const newSelection = selectedSeats.filter((id) => id !== seatId);
      console.log("New selection after deselection:", newSelection); // Debug log

      // Remove passenger name for this seat
      setPassengerNames((prev) => {
        const updated = { ...prev };
        delete updated[seatId];
        return updated;
      });

      // Emit real-time unlock event for this specific seat
      console.log("Emitting seat-deselected event for:", seatId);
      emit("seat-deselected", {
        scheduleId,
        seatId,
        sessionId,
      });

      // Also emit seats-unlocked event to immediately update UI for other users
      emit("seats-unlocked", {
        seatId,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      // Immediately release this specific seat lock
      releaseSeats(seatId)
        .then((response) => {
          console.log("Seat lock released successfully:", response);
        })
        .catch((error) => {
          console.error("Error releasing seat lock:", error);
          toast.error("Failed to release seat lock");
        });

      // Immediately update UI
      setSelectedSeats(newSelection);

      // If we still have seats selected, update locks for remaining seats
      if (newSelection.length > 0) {
        console.log("Updating locks for remaining seats:", newSelection);
        // Don't await this - let it run in background
        lockSeats(newSelection).catch((error) => {
          console.error("Error updating locks:", error);
          toast.error("Failed to update seat locks");
        });
      } else {
        console.log("No seats remaining, releasing all locks");
        // Release all locks if no seats selected
        // Don't await this - let it run in background
        releaseSeats().catch((error) => {
          console.error("Error releasing locks:", error);
        });
        setLockTimeRemaining(0);
        // Clear localStorage
        localStorage.removeItem(`seat_lock_session_${scheduleId}`);
        localStorage.removeItem(`passenger_names_${scheduleId}`);
      }
    } else if (selectedSeats.length < passengers) {
      console.log("Selecting seat:", seatId);
      toast.success(`Selecting seat ${seat.seatNumber}`);
      // Select seat - add to current selection and lock all selected seats
      const newSelection = [...selectedSeats, seatId];
      console.log("New selection after selection:", newSelection); // Debug log

      // Immediately update UI
      setSelectedSeats(newSelection);

      // Don't await this - let it run in background
      lockSeats(newSelection).catch((error) => {
        console.error("Error locking seats:", error);
        toast.error("Failed to lock seats");
      });
    } else {
      toast.error(
        `You can only select ${passengers} seat${
          passengers !== 1 ? "s" : ""
        }. ` +
          `To select more seats, please change the passenger number. ` +
          `Maximum 4 seats per booking.`
      );
    }
  };

  // New function to handle individual seat removal from summary
  const handleRemoveSeat = async (seatId: string) => {
    // Check if user is authenticated
    if (status !== "authenticated") {
      setShowLoginModal(true);
      return;
    }

    console.log("Removing seat from summary:", seatId);

    const seat = seats.find((s) => s.id === seatId);
    if (!seat) {
      console.log("Seat not found for removal");
      toast.error("Seat not found");
      return;
    }

    toast.success(`Removing seat ${seat.seatNumber} from selection`);
    // Immediately deselect seat - remove from current selection
    const newSelection = selectedSeats.filter((id) => id !== seatId);
    console.log("New selection after removal:", newSelection); // Debug log

    // Remove passenger name for this seat
    setPassengerNames((prev) => {
      const updated = { ...prev };
      delete updated[seatId];
      return updated;
    });

    // Emit real-time unlock event for this specific seat
    console.log("Emitting seat-deselected event for removal:", seatId);
    emit("seat-deselected", {
      scheduleId,
      seatId,
      sessionId,
    });

    // Also emit seats-unlocked event to immediately update UI for other users
    emit("seats-unlocked", {
      seatId,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    // Immediately release this specific seat lock
    releaseSeats(seatId)
      .then((response) => {
        console.log("Seat lock released successfully:", response);
      })
      .catch((error) => {
        console.error("Error releasing seat lock:", error);
        toast.error("Failed to release seat lock");
      });

    // Immediately update UI
    setSelectedSeats(newSelection);

    // If we still have seats selected, update locks for remaining seats
    if (newSelection.length > 0) {
      console.log(
        "Updating locks for remaining seats after removal:",
        newSelection
      );
      // Don't await this - let it run in background
      lockSeats(newSelection).catch((error) => {
        console.error("Error updating locks:", error);
        toast.error("Failed to update seat locks");
      });
    } else {
      console.log("No seats remaining after removal, releasing all locks");
      // Release all locks if no seats selected
      // Don't await this - let it run in background
      releaseSeats().catch((error) => {
        console.error("Error releasing locks:", error);
      });
      setLockTimeRemaining(0);
      // Clear localStorage
      localStorage.removeItem(`seat_lock_session_${scheduleId}`);
      localStorage.removeItem(`passenger_names_${scheduleId}`);
    }

    toast.success(`Seat ${seat.seatNumber} removed from selection`);
  };

  const lockSeats = async (seatIds: string[]) => {
    try {
      setIsLocking(true);

      // Emit socket event for real-time updates
      const firstPassengerName =
        Object.values(passengerNames)[0] || "Anonymous";
      emit("seat-lock-attempt", {
        scheduleId,
        seatIds,
        sessionId,
        userName: firstPassengerName,
      });

      const response = await fetch("/api/seats/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          seatIds,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedSeats(seatIds);
        setLockTimeRemaining(5 * 60); // 5 minutes

        // Store lock information in localStorage
        localStorage.setItem(
          `seat_lock_session_${scheduleId}`,
          JSON.stringify({
            sessionId,
            seatIds,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
        );

        toast.success(
          `${seatIds.length} seat${seatIds.length !== 1 ? "s" : ""} ` +
            `locked successfully! You have 5 minutes to complete booking.`
        );

        // Emit success event
        emit("seat-lock-success", {
          scheduleId,
          seatIds,
          sessionId,
          expiresAt: data.data.expiresAt,
        });

        // Refresh seat map to show updated locks
        await fetchSeatMap();
      } else {
        // Handle conflict errors specifically
        if (response.status === 409) {
          toast.error(
            `Conflict: ${data.error}. Please select different seats.`
          );
          // Refresh seat map to show current availability
          await fetchSeatMap();
        } else {
          toast.error(data.error || "Failed to lock seats");
        }
        // Reset selection on failure
        setSelectedSeats([]);

        // If it's a specific seat availability error, refresh the seat map
        if (data.error && data.error.includes("no longer available")) {
          await fetchSeatMap();
        }
      }
    } catch (error) {
      console.error("Error locking seats:", error);
      toast.error("Failed to lock seats. Please try again.");
      setSelectedSeats([]);
    } finally {
      setIsLocking(false);
    }
  };

  const releaseSeats = async (seatId?: string) => {
    try {
      let url = `/api/seats/lock?sessionId=${sessionId}`;
      if (seatId) {
        url += `&seatId=${seatId}&scheduleId=${scheduleId}`;
      }

      console.log("Releasing seats with URL:", url);
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        console.error(
          "Failed to release seats:",
          response.status,
          response.statusText
        );
        throw new Error(`Failed to release seats: ${response.status}`);
      }

      const data = await response.json();
      console.log("Release seats response:", data);

      // If releasing a specific seat, also clear it from localStorage
      if (seatId) {
        localStorage.removeItem(`seat_lock_session_${scheduleId}`);
      }

      return data;
    } catch (error) {
      console.error("Error releasing seats:", error);
      throw error;
    }
  };

  // Save passenger names to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(passengerNames).length > 0) {
      localStorage.setItem(
        `passenger_names_${scheduleId}`,
        JSON.stringify(passengerNames)
      );
    }
  }, [passengerNames, scheduleId]);

  // Save contact info to localStorage whenever it changes
  useEffect(() => {
    if (contactInfo.phone || contactInfo.email) {
      localStorage.setItem(
        `contact_info_${scheduleId}`,
        JSON.stringify(contactInfo)
      );
    }
  }, [contactInfo, scheduleId]);

  const handleBooking = async () => {
    // Check if user is authenticated
    if (status !== "authenticated") {
      setShowLoginModal(true);
      return;
    }

    if (selectedSeats.length !== passengers) {
      toast.error(
        `Please select exactly ${passengers} seat${
          passengers !== 1 ? "s" : ""
        }. ` +
          `To select a different number of seats, please go back and change the passenger number.`
      );
      return;
    }

    // Validate all passenger information
    const missingNames = selectedSeats.filter(
      (seatId) => !passengerNames[seatId]?.trim()
    );

    if (missingNames.length > 0) {
      toast.error("Please enter names for all passengers");
      return;
    }

    if (!contactInfo.phone?.trim() || !contactInfo.email?.trim()) {
      toast.error("Please enter contact phone and email");
      return;
    }

    try {
      setIsBooking(true);

      // Use the first passenger name for the main booking record
      // and pass all passenger names in the request
      const passengerInfo = {
        name: passengerNames[selectedSeats[0]] || "Primary Passenger",
        phone: contactInfo.phone,
        email: contactInfo.email,
      };

      const passengersData = selectedSeats.map((seatId) => ({
        name: passengerNames[seatId],
        phone: contactInfo.phone,
        email: contactInfo.email,
        seatId,
      }));

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          seatIds: selectedSeats,
          passengerInfo,
          passengersData,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Booking created successfully!");

        // Clear localStorage after successful booking
        localStorage.removeItem(`seat_lock_session_${scheduleId}`);
        localStorage.removeItem(`passenger_names_${scheduleId}`);
        localStorage.removeItem(`contact_info_${scheduleId}`);

        // Store booking data for payment page
        sessionStorage.setItem(
          `booking_${data.data.booking.id}`,
          JSON.stringify(data.data)
        );

        onBookingComplete(data.data);
      } else {
        toast.error(data.error || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking");
    } finally {
      setIsBooking(false);
    }
  };

  // New function to clear all seat selections
  const clearSeatSelection = async () => {
    // Check if user is authenticated
    if (status !== "authenticated") {
      setShowLoginModal(true);
      return;
    }

    if (selectedSeats.length === 0) return;

    // Immediately clear selection state
    setSelectedSeats([]);
    setLockTimeRemaining(0);

    // Clear passenger names for deselected seats
    setPassengerNames({});

    // Clear localStorage
    localStorage.removeItem(`seat_lock_session_${scheduleId}`);
    localStorage.removeItem(`passenger_names_${scheduleId}`);

    // Release all locks in background
    releaseSeats().catch((error) => {
      console.error("Error releasing locks:", error);
      toast.error("Failed to release seat locks");
    });

    toast.success("Seat selection cleared");
  };

  const getSeatClassName = (seat: Seat) => {
    const baseClasses =
      "w-10 h-10 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium relative";

    // Check if this seat is currently selected by the user
    const isCurrentlySelected = selectedSeats.includes(seat.id);

    // Check if this seat is locked by another user (not the current session)
    const isLockedByOther = seat.status === "locked" && !isCurrentlySelected;

    if (seat.status === "booked") {
      return `${baseClasses} bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 cursor-not-allowed text-red-700 dark:text-red-300`;
    }

    if (isLockedByOther) {
      return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 cursor-not-allowed text-yellow-700 dark:text-yellow-300`;
    }

    if (isCurrentlySelected) {
      return `${baseClasses} bg-blue-500 border-blue-600 text-white shadow-lg transform scale-105`;
    }

    if (seat.seatType === "PREMIUM") {
      return `${baseClasses} bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:border-purple-400`;
    }

    if (seat.seatType === "SLEEPER") {
      return `${baseClasses} bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400`;
    }

    return `${baseClasses} bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 hover:border-green-400`;
  };

  const totalAmount = selectedSeats.reduce((total, seatId) => {
    const seat = seats.find((s) => s.id === seatId);
    return total + (seat?.price || 0);
  }, 0);

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes / 60);
    const secs = minutes % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="ml-2 text-muted-foreground">Loading seat map...</span>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Schedule not found</p>
      </div>
    );
  }

  const departure = formatDateTime(schedule.departureTime);

  return (
    <div className="space-y-6">
      {/* Schedule Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                Route
              </div>
              <div className="text-lg font-semibold">
                {schedule.route.origin.name} → {schedule.route.destination.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDistance(schedule.route.distance || 0)} km •{" "}
                {Math.floor((schedule.route.duration || 0) / 60)}h{" "}
                {(schedule.route.duration || 0) % 60}m
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                Departure
              </div>
              <div className="text-lg font-semibold">{departure.time}</div>
              <div className="text-sm text-muted-foreground">
                {departure.date}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                Bus Details
              </div>
              <div className="text-lg font-semibold">
                {schedule.operator.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {schedule.bus.busNumber} • {schedule.bus.busType}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Select Your Seats</CardTitle>
              {lockTimeRemaining > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {formatTime(lockTimeRemaining)}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Driver area */}
              <div className="flex justify-center">
                <div className="bg-muted px-4 py-2 rounded-lg text-sm font-medium">
                  🚗 Driver
                </div>
              </div>

              {/* Seat grid */}
              <div className="space-y-4">
                {Object.entries(seatMap).map(([row, rowSeats]) => (
                  <div key={row} className="flex items-center gap-2">
                    <div className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {row}
                    </div>
                    <div className="flex gap-2">
                      {rowSeats.slice(0, 2).map((seat) => (
                        <div
                          key={seat.id}
                          className={getSeatClassName(seat)}
                          onClick={() => handleSeatClick(seat.id)}
                          title={`Seat ${seat.seatNumber} - ${seat.seatType} ($${seat.price})`}
                        >
                          {seat.seatNumber.slice(-1)}
                          {selectedSeats.includes(seat.id) && (
                            <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-blue-600 bg-white rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="w-8"></div> {/* Aisle */}
                    <div className="flex gap-2">
                      {rowSeats.slice(2).map((seat) => (
                        <div
                          key={seat.id}
                          className={getSeatClassName(seat)}
                          onClick={() => handleSeatClick(seat.id)}
                          title={`Seat ${seat.seatNumber} - ${seat.seatType} ($${seat.price})`}
                        >
                          {seat.seatNumber.slice(-1)}
                          {selectedSeats.includes(seat.id) && (
                            <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-blue-600 bg-white rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 justify-center text-xs border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700 rounded"></div>
                  <span>Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded"></div>
                  <span>Locked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded"></div>
                  <span>Booked</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary */}
        <div className="space-y-6">
          {/* Selected Seats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Selected Seats ({selectedSeats.length}/{passengers})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSeats.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No seats selected
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedSeats.map((seatId) => {
                    const seat = seats.find((s) => s.id === seatId);
                    if (!seat) return null;

                    return (
                      <div
                        key={seatId}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium">
                            Seat {seat.seatNumber || "N/A"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {seat.seatType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(seat.price)}</span>
                          <button
                            onClick={() => handleRemoveSeat(seatId)}
                            className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400"
                            title="Remove seat"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {selectedSeats.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Clear Selection Button */}
                  <div className="pt-3">
                    <button
                      onClick={clearSeatSelection}
                      className="w-full px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={isLocking || isBooking}
                    >
                      <X className="h-4 w-4 mr-2 inline" />
                      Clear Seat Selection
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passenger Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Passenger Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter individual names and shared contact details
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedSeats.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Select seats to enter passenger information
                </p>
              ) : (
                <>
                  {/* Individual Passenger Names */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">
                      Passenger Names
                    </h3>
                    {selectedSeats.map((seatId, index) => {
                      const seat = seats.find((s) => s.id === seatId);
                      const seatNumber = seat?.seatNumber || "N/A";

                      return (
                        <div
                          key={seatId}
                          className="flex items-center gap-3 p-3 border border-border rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="flex-shrink-0">
                              <span className="font-medium text-sm">
                                Seat {seatNumber}:
                              </span>
                            </div>
                            <Input
                              value={passengerNames[seatId] || ""}
                              onChange={(e) =>
                                setPassengerNames((prev) => ({
                                  ...prev,
                                  [seatId]: e.target.value,
                                }))
                              }
                              placeholder={`Passenger ${index + 1} full name`}
                              className="flex-1"
                              required
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs flex-shrink-0"
                          >
                            {seat?.seatType}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shared Contact Information */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="font-semibold text-foreground">
                      Contact Information
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This will be used for all passengers
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="contact-phone">Phone Number *</Label>
                        <Input
                          id="contact-phone"
                          value={contactInfo.phone}
                          onChange={(e) =>
                            setContactInfo((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="Enter phone number"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="contact-email">Email Address *</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={contactInfo.email}
                          onChange={(e) =>
                            setContactInfo((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Proceed Button */}
          <Button
            onClick={handleBooking}
            disabled={
              selectedSeats.length !== passengers ||
              selectedSeats.some((seatId) => !passengerNames[seatId]?.trim()) ||
              !contactInfo.phone?.trim() ||
              !contactInfo.email?.trim() ||
              isBooking ||
              isLocking
            }
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
          >
            {isBooking ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating Booking...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Proceed to Payment ({formatCurrency(totalAmount)})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Login Required Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Login Required
            </DialogTitle>
            <DialogDescription>
              Please sign in to select seats and book your journey.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              You need to be logged in to select seats and proceed with booking.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLoginModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowLoginModal(false);
                  router.push("/auth/signin");
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
