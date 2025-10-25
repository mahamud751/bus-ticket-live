"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Download,
  Printer,
  Share2,
  Clock,
  Navigation,
} from "lucide-react";
import { TicketPDFGenerator } from "@/lib/pdf-generator";
import { formatDistance } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface BookingDetails {
  id: string;
  pnr: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  bookingDate: string;
  schedule: {
    departureTime: string;
    arrivalTime: string;
    route: {
      origin: {
        name: string;
        code: string;
      };
      destination: {
        name: string;
        code: string;
      };
      distance: number;
      duration: number;
    };
    bus: {
      busNumber: string;
      busType: string;
      amenities: string[];
    };
    operator: {
      name: string;
    };
  };
  seats: Array<{
    id: string;
    price: number;
    seat: {
      seatNumber: string;
      seatType: string;
    };
  }>;
  passengers?: Array<{
    id: string;
    passengerName: string;
    seat: {
      seatNumber: string;
      seatType: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    transactionId: string;
    processedAt: string;
  }>;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const pnr = params?.pnr as string;

  const [isMobileView, setIsMobileView] = useState(false);

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mobileParam = urlParams.get("mobile");
    const isMobileDevice =
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent
      );
    setIsMobileView(mobileParam === "true" || isMobileDevice);
  }, []);

  const normalizeBookingData = (bookingData: unknown): BookingDetails => {
    const data = bookingData as Record<string, unknown>;
    return {
      ...(data as Record<string, unknown>),
      seats: (((data as Record<string, unknown>).seats as unknown[]) || []).map(
        (seatBooking: unknown) => {
          const seat = seatBooking as Record<string, unknown>;
          return {
            ...seat,
            seat: {
              seatNumber:
                (seat.seat as Record<string, unknown>)?.seatNumber || "N/A",
              seatType:
                (seat.seat as Record<string, unknown>)?.seatType || "REGULAR",
              ...(seat.seat as Record<string, unknown>),
            },
          };
        }
      ),
      payments: (data as Record<string, unknown>).payments || [],
      schedule: {
        ...((data as Record<string, unknown>).schedule as Record<
          string,
          unknown
        >),
        route: {
          ...((
            (data as Record<string, unknown>).schedule as Record<
              string,
              unknown
            >
          )?.route as Record<string, unknown>),
          distance:
            (
              (
                (data as Record<string, unknown>).schedule as Record<
                  string,
                  unknown
                >
              )?.route as Record<string, unknown>
            )?.distance || 0,
          duration:
            (
              (
                (data as Record<string, unknown>).schedule as Record<
                  string,
                  unknown
                >
              )?.route as Record<string, unknown>
            )?.duration || 0,
        },
        bus: {
          ...((
            (data as Record<string, unknown>).schedule as Record<
              string,
              unknown
            >
          )?.bus as Record<string, unknown>),
          amenities:
            (
              (
                (data as Record<string, unknown>).schedule as Record<
                  string,
                  unknown
                >
              )?.bus as Record<string, unknown>
            )?.amenities || [],
        },
      },
    } as BookingDetails;
  };

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!pnr) {
          router.push("/");
          return;
        }

        const sessionData = sessionStorage.getItem(`booking_confirmed_${pnr}`);
        if (sessionData) {
          const rawBooking = JSON.parse(sessionData);
          setBooking(normalizeBookingData(rawBooking));
          setIsLoading(false);
          return;
        }

        const email = prompt("Please enter your email to verify booking:");
        if (!email) {
          router.push("/");
          return;
        }

        const response = await fetch(
          `/api/bookings?pnr=${pnr}&email=${encodeURIComponent(email)}`
        );
        const data = await response.json();

        if (data.success) {
          const normalizedBooking = normalizeBookingData(data.data.booking);
          setBooking(normalizedBooking);

          sessionStorage.setItem(
            `booking_confirmed_${pnr}`,
            JSON.stringify(normalizedBooking)
          );
        } else {
          toast.error(data.error || "Booking not found");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error("Failed to load booking details");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [pnr, router]);

  const handleDownloadTicket = () => {
    if (booking) {
      const ticketData = {
        pnr: booking.pnr,
        passengerName: booking.passengerName,
        passengerPhone: booking.passengerPhone,
        passengerEmail: booking.passengerEmail,
        totalAmount: booking.totalAmount,
        route: {
          origin: booking.schedule.route.origin.name,
          destination: booking.schedule.route.destination.name,
        },
        schedule: {
          departureTime: booking.schedule.departureTime,
          arrivalTime: booking.schedule.arrivalTime,
        },
        operator: booking.schedule.operator.name,
        busNumber: booking.schedule.bus.busNumber,
        seats: booking.seats.map((seat) => ({
          seatNumber: seat.seat?.seatNumber || "N/A",
          seatType: seat.seat?.seatType || "Regular",
          price: seat.price,
        })),
        passengers:
          booking.passengers?.map((passenger) => ({
            passengerName: passenger.passengerName,
            seatNumber: passenger.seat?.seatNumber || "N/A",
          })) || undefined,
      };

      TicketPDFGenerator.downloadTicket(ticketData);
      toast.success("Ticket downloaded successfully!");
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const handleShareBooking = () => {
    if (navigator.share) {
      navigator.share({
        title: "Bus Ticket Booking",
        text: `My bus booking (PNR: ${pnr}) from ${booking?.schedule.route.origin.name} to ${booking?.schedule.route.destination.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Booking link copied to clipboard!");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">
              Loading booking details...
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              We couldn&apos;t find the booking with PNR: {pnr}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const departure = formatDateTime(booking.schedule.departureTime);
  const arrival = formatDateTime(booking.schedule.arrivalTime);
  const bookingDate = formatDateTime(booking.bookingDate);

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1
            className={`font-bold text-foreground mb-2 ${
              isMobileView ? "text-2xl" : "text-3xl"
            }`}
          >
            Booking Confirmed!
          </h1>
          <p
            className={`text-muted-foreground ${
              isMobileView ? "text-base" : "text-lg"
            }`}
          >
            Your bus ticket has been successfully booked
          </p>
          <div className="mt-4">
            <Badge
              variant="outline"
              className={`px-4 py-2 ${isMobileView ? "text-base" : "text-lg"}`}
            >
              PNR: {booking.pnr}
            </Badge>
          </div>
          {isMobileView && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                📱 <strong>Mobile View:</strong> Optimized for your device. Tap
                actions below or use the QR scanner for validation.
              </p>
            </div>
          )}
        </div>

        <div
          className={`flex flex-wrap justify-center gap-4 mb-8 ${
            isMobileView ? "flex-col" : ""
          }`}
        >
          <Button
            onClick={handleDownloadTicket}
            className={`bg-blue-600 hover:bg-blue-700 ${
              isMobileView ? "w-full text-base py-3" : ""
            }`}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Ticket
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintTicket}
            className={isMobileView ? "w-full text-base py-3" : ""}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Ticket
          </Button>
          <Button
            variant="outline"
            onClick={handleShareBooking}
            className={isMobileView ? "w-full text-base py-3" : ""}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Booking
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Journey Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {booking.schedule.route.origin.name}
                  </div>
                  <div className="text-muted-foreground">Origin</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{departure.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {departure.time}
                    </span>
                  </div>
                </div>

                <div className="text-right md:text-left">
                  <div className="text-2xl font-bold text-foreground">
                    {booking.schedule.route.destination.name}
                  </div>
                  <div className="text-muted-foreground">Destination</div>
                  <div className="flex items-center gap-2 mt-2 justify-end md:justify-start">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{arrival.date}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end md:justify-start">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {arrival.time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>
                    {formatDistance(booking.schedule.route.distance || 0)} km
                  </span>
                  <span>•</span>
                  <span>
                    {formatDuration(booking.schedule.route.duration || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bus Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-lg font-semibold">
                    {booking.schedule.operator.name}
                  </div>
                  <div className="text-muted-foreground">
                    {booking.schedule.bus.busNumber}
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {booking.schedule.bus.busType}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Amenities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(booking.schedule.bus.amenities || []).map((amenity) => (
                      <Badge
                        key={amenity}
                        variant="secondary"
                        className="text-xs"
                      >
                        {amenity.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Passenger Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="pb-3 border-b border-border">
                  <h4 className="font-medium text-foreground mb-2">
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.passengerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.passengerEmail}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {booking.passengers && booking.passengers.length > 0
                      ? "Passengers"
                      : "Passenger"}
                  </h4>
                  <div className="space-y-2">
                    {booking.passengers && booking.passengers.length > 0 ? (
                      booking.passengers.map((passenger, index) => (
                        <div
                          key={passenger.id}
                          className="flex items-center gap-2"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{passenger.passengerName}</span>
                          <span className="text-sm text-muted-foreground">
                            (Seat {passenger.seat.seatNumber})
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.passengerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seat Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(booking.seats || []).map((seatBooking) => (
                    <div
                      key={seatBooking.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-sm font-medium text-blue-700">
                          {seatBooking.seat?.seatNumber || "N/A"}
                        </div>
                        <div>
                          <div className="font-medium">
                            Seat {seatBooking.seat?.seatNumber || "N/A"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {seatBooking.seat?.seatType || "Regular"}
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold">${seatBooking.price}</div>
                    </div>
                  ))}

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Paid:</span>
                      <span className="text-green-600">
                        ${booking.totalAmount}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Booking Reference
                  </div>
                  <div className="font-semibold">{booking.pnr}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Booking Status
                  </div>
                  <Badge
                    variant={
                      booking.status === "CONFIRMED" ? "default" : "secondary"
                    }
                    className="mt-1"
                  >
                    {booking.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Booked On</div>
                  <div className="font-semibold">
                    {bookingDate.date} at {bookingDate.time}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {booking.payments && booking.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                {(booking.payments || []).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold">${payment.amount}</div>
                      <div className="text-sm text-gray-600">
                        Transaction ID: {payment.transactionId}
                      </div>
                    </div>
                    <Badge
                      variant={
                        payment.status === "COMPLETED" ? "default" : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-8 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-orange-800 mb-3">
              Important Notes:
            </h3>
            <ul className="space-y-2 text-sm text-orange-700">
              <li>
                • Please arrive at the departure point at least 30 minutes
                before departure
              </li>
              <li>• Carry a valid photo ID along with this ticket</li>
              <li>
                • Cancellation and refund policies apply as per terms and
                conditions
              </li>
              <li>• For any queries, contact our support team with your PNR</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
