"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CreditCard,
  CheckCircle,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "react-hot-toast";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface BookingData {
  booking: {
    id: string;
    pnr: string;
    status: string;
    totalAmount: number;
    passengerInfo: {
      name: string;
      phone: string;
      email: string;
    };
  };
  payment: {
    clientSecret: string;
    paymentIntentId: string;
    isMockPayment?: boolean;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
    route: {
      origin: string;
      destination: string;
    };
    operator: string;
    bus: {
      busNumber: string;
      busType: string;
    };
  };
  seats: Array<{
    id: string;
    seatNumber: string;
    seatType: string;
    price: number;
  }>;
  passengers?: Array<{
    name: string;
    seatId: string;
  }>;
}

function PaymentForm({ booking }: { booking: BookingData }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const isMockPayment = booking.payment.isMockPayment || false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);

    try {
      if (isMockPayment) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: booking.payment.paymentIntentId,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          toast.success("Payment successful!");

          sessionStorage.setItem(
            `booking_confirmed_${result.data.booking.pnr}`,
            JSON.stringify(result.data.booking)
          );

          router.push(`/booking/confirmation/${result.data.booking.pnr}`);
        } else {
          toast.error(result.error || "Payment failed. Please try again.");
        }
      } else {
        if (!stripe || !elements) {
          toast.error("Payment system not ready. Please try again.");
          return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          toast.error("Please enter your card details.");
          return;
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(
          booking.payment.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: booking.booking.passengerInfo.name,
                email: booking.booking.passengerInfo.email,
                phone: booking.booking.passengerInfo.phone,
              },
            },
          }
        );

        if (error) {
          toast.error(error.message || "Payment failed");
        } else if (paymentIntent.status === "succeeded") {
          toast.success("Payment successful!");

          sessionStorage.setItem(
            `booking_confirmed_${booking.booking.pnr}`,
            JSON.stringify({
              ...booking,
              booking: {
                ...booking.booking,
                status: "CONFIRMED",
              },
              payments: [
                {
                  id: paymentIntent.id,
                  amount: booking.booking.totalAmount,
                  status: "COMPLETED",
                  transactionId: paymentIntent.id,
                  processedAt: new Date().toISOString(),
                },
              ],
            })
          );

          router.push(`/booking/confirmation/${booking.booking.pnr}`);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
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

  const departure = formatDateTime(booking.schedule.departureTime);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-lg font-semibold">
                {booking.schedule.route.origin} →{" "}
                {booking.schedule.route.destination}
              </div>
              <div className="text-gray-600">
                {booking.schedule.operator} • {booking.schedule.bus.busNumber}
              </div>
              <Badge variant="outline" className="mt-2">
                {booking.schedule.bus.busType}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {departure.date} at {departure.time}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Passenger Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">
                Contact Information
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{booking.booking.passengerInfo.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{booking.booking.passengerInfo.email}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {booking.passengers && booking.passengers.length > 0
                  ? "Passengers"
                  : "Passenger"}
              </h4>
              <div className="space-y-2">
                {booking.passengers && booking.passengers.length > 0 ? (
                  booking.passengers.map((passenger, index) => {
                    const seat = booking.seats.find(
                      (s) => s.id === passenger.seatId
                    );
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{passenger.name}</span>
                        {seat && (
                          <span className="text-sm text-gray-500">
                            (Seat {seat.seatNumber})
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{booking.booking.passengerInfo.name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.seats.map((seat) => (
                <div
                  key={seat.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-sm font-medium text-blue-700">
                      {seat.seatNumber || "N/A"}
                    </div>
                    <div>
                      <div className="font-medium">
                        Seat {seat.seatNumber || "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {seat.seatType || "Regular"}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">${seat.price}</div>
                </div>
              ))}

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-green-600">
                    ${booking.booking.totalAmount}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isMockPayment ? (
                // Mock Payment UI
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 text-sm">
                        <strong>🧪 Development Mode - Mock Payment</strong>
                        <br />
                        This is a simulated payment for testing purposes.
                        <br />
                        • No real money will be charged
                        <br />
                        • Payment will be automatically processed
                        <br />• 95% success rate (5% simulated failures for
                        testing)
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="text-center text-gray-600">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="font-medium">Mock Payment Processing</p>
                      <p className="text-sm">
                        No card details required in development mode
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Information
                    </label>
                    <div className="p-3 border border-gray-300 rounded-lg bg-white">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              fontSize: "16px",
                              color: "#424770",
                              "::placeholder": {
                                color: "#aab7c4",
                              },
                            },
                            invalid: {
                              color: "#9e2146",
                            },
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <div className="text-yellow-600 text-sm">
                        <strong>Test Card Numbers:</strong>
                        <br />
                        • 4242 4242 4242 4242 (Visa)
                        <br />
                        • 5555 5555 5555 4444 (Mastercard)
                        <br />• Use any future date for expiry and any 3-digit
                        CVC
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                disabled={(!stripe && !isMockPayment) || isProcessing}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg font-semibold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {isMockPayment
                      ? "Simulating Payment..."
                      : "Processing Payment..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {isMockPayment ? "Simulate Payment" : "Pay"} $
                    {booking.booking.totalAmount}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                {isMockPayment
                  ? "Development mode - simulated payment processing"
                  : "Your payment is secured with 256-bit SSL encryption"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!bookingId) {
          router.push("/");
          return;
        }

        const bookingData = sessionStorage.getItem(`booking_${bookingId}`);
        if (bookingData) {
          setBooking(JSON.parse(bookingData));
        } else {
          toast.error("Booking not found");
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
  }, [bookingId, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">
              Loading payment details...
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The booking details could not be found.
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

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Complete Your Payment
          </h1>
          <p className="text-gray-600">
            Booking Reference:{" "}
            <span className="font-medium">{booking.booking.pnr}</span>
          </p>
        </div>

        <Elements stripe={stripePromise}>
          <PaymentForm booking={booking} />
        </Elements>
      </div>
    </main>
  );
}
