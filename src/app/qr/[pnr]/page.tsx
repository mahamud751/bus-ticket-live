"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bus,
  CheckCircle,
  Download,
  Eye,
  QrCode,
  Share2,
  Smartphone,
  Ticket,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface TicketData {
  pnr: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  route: {
    origin: string;
    destination: string;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
  };
  operator: string;
  busNumber: string;
  seats: Array<{
    seatNumber: string;
    seatType: string;
    price: number;
  }>;
  passengers: Array<{
    passengerName: string;
    seatNumber: string;
  }>;
}

export default function QRMobilePage() {
  const params = useParams();
  const router = useRouter();
  const pnr = params?.pnr as string;

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        if (!pnr) {
          setError("Invalid QR code - no PNR found");
          return;
        }

        const response = await fetch(
          `/api/qr/download?pnr=${pnr}&action=mobile&format=json`
        );
        const data = await response.json();

        if (data.success && data.ticket) {
          setTicketData(data.ticket);
        } else {
          setError(data.error || "Ticket not found");
        }
      } catch (err) {
        console.error("Error fetching ticket data:", err);
        setError("Failed to load ticket data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketData();
  }, [pnr]);

  const handleViewFullTicket = () => {
    router.push(`/booking/confirmation/${pnr}?mobile=true`);
  };

  const handleDownloadPDF = () => {
    if (ticketData) {
      // Import and use the PDF generator
      import("@/lib/pdf-generator").then(({ TicketPDFGenerator }) => {
        const pdfData = {
          pnr: ticketData.pnr,
          passengerName: ticketData.passengerName,
          passengerPhone: ticketData.passengerPhone,
          passengerEmail: ticketData.passengerEmail,
          totalAmount: ticketData.totalAmount,
          route: {
            origin: ticketData.route.origin,
            destination: ticketData.route.destination,
          },
          schedule: {
            departureTime: ticketData.schedule.departureTime,
            arrivalTime: ticketData.schedule.arrivalTime,
          },
          operator: ticketData.operator,
          busNumber: ticketData.busNumber,
          seats: ticketData.seats,
          passengers: ticketData.passengers,
        };

        TicketPDFGenerator.downloadTicket(pdfData);
        toast.success("📱 PDF ticket downloaded!");
      });
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/booking/confirmation/${pnr}`;

    if (navigator.share) {
      navigator
        .share({
          title: `Bus Ticket - ${pnr}`,
          text: `My bus ticket from ${ticketData?.route.origin} to ${ticketData?.route.destination}`,
          url: shareUrl,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("📋 Ticket link copied to clipboard!");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">📱 Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-pink-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              ❌ Ticket Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              {error || "The QR code doesn't contain a valid ticket."}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departure = formatDateTime(ticketData.schedule.departureTime);
  const arrival = formatDateTime(ticketData.schedule.arrivalTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="flex items-center justify-center text-white">
          <Smartphone className="h-6 w-6 mr-2" />
          <h1 className="text-lg font-semibold">Mobile Ticket View</h1>
        </div>
      </div>

      <div className="p-4 pb-20">
        <div className="max-w-md mx-auto space-y-6">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              🎟️ Ticket Found!
            </h2>
            <p className="text-green-100">QR code scanned successfully</p>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-foreground">
                    Bus Ticket
                  </CardTitle>
                  <Badge
                    variant={
                      ticketData.status === "CONFIRMED"
                        ? "default"
                        : "secondary"
                    }
                    className="bg-green-500"
                  >
                    {ticketData.status}
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge
                    variant="outline"
                    className="text-lg px-4 py-2 font-mono"
                  >
                    {ticketData.pnr}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>From</span>
                    <Bus className="h-4 w-4" />
                    <span>To</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-bold text-lg text-gray-900">
                        {ticketData.route.origin}
                      </div>
                      <div className="text-sm text-gray-600">
                        {departure.date}
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {departure.time}
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-gray-400" />
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-900">
                        {ticketData.route.destination}
                      </div>
                      <div className="text-sm text-gray-600">
                        {arrival.date}
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {arrival.time}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger & Seat Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center text-gray-600 text-sm mb-1">
                      <User className="h-4 w-4 mr-1" />
                      Passenger
                    </div>
                    <div className="font-semibold text-gray-900">
                      {ticketData.passengerName}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center text-gray-600 text-sm mb-1">
                      <Ticket className="h-4 w-4 mr-1" />
                      Seats
                    </div>
                    <div className="font-semibold text-gray-900">
                      {ticketData.seats.map((s) => s.seatNumber).join(", ")}
                    </div>
                  </div>
                </div>

                <div className="bg-muted dark:bg-muted rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">Bus Details</div>
                  <div className="font-semibold text-gray-900">
                    {ticketData.operator}
                  </div>
                  <div className="text-sm text-gray-600">
                    Bus: {ticketData.busNumber}
                  </div>
                </div>

                <div className="text-center bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-1">
                    Total Amount
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ৳{ticketData.totalAmount}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-3"
          >
            <Button
              onClick={handleViewFullTicket}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
            >
              <Eye className="h-5 w-5 mr-2" />
              View Full Ticket Details
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="bg-white/90 border-white/50 hover:bg-white text-gray-900 py-3"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="bg-white/90 border-white/50 hover:bg-white text-gray-900 py-3"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Quick Actions
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong>View Details:</strong> See complete booking
                      information and journey details
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong>Download PDF:</strong> Save ticket for offline use
                      and printing
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong>Share:</strong> Send booking details to family or
                      friends
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700">
                    <strong>✅ Mobile Optimized:</strong> This page is designed
                    for mobile scanning. Keep your phone charged and carry a
                    valid ID for travel.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
