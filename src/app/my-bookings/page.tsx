"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Calendar,
  Eye,
  Search,
  MessageCircle,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

interface Booking {
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
}

// Comment interface
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [associatedTicket, setAssociatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      loadBookingsFromAPI();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = bookings.filter((booking) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          (booking.pnr && booking.pnr.toLowerCase().includes(searchLower)) ||
          (booking.schedule?.route?.origin?.name &&
            booking.schedule.route.origin.name
              .toLowerCase()
              .includes(searchLower)) ||
          (booking.schedule?.route?.destination?.name &&
            booking.schedule.route.destination.name
              .toLowerCase()
              .includes(searchLower)) ||
          (booking.passengerName &&
            booking.passengerName.toLowerCase().includes(searchLower))
        );
      });
      setFilteredBookings(filtered);
    } else {
      setFilteredBookings(bookings);
    }
  }, [searchQuery, bookings]);

  const loadBookingsFromAPI = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/bookings");

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please sign in to view your bookings");
          router.push("/auth/signin");
        } else {
          throw new Error("Failed to load bookings");
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        const sortedBookings = data.data.bookings.sort(
          (a: Booking, b: Booking) =>
            new Date(b.bookingDate).getTime() -
            new Date(a.bookingDate).getTime()
        );

        setBookings(sortedBookings);
        setFilteredBookings(sortedBookings);
      } else {
        throw new Error(data.error || "Failed to load bookings");
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const searchBookingByEmail = async () => {
    if (!searchEmail || !searchQuery) {
      toast.error("Please enter both PNR and email address");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/bookings?pnr=${encodeURIComponent(
          searchQuery
        )}&email=${encodeURIComponent(searchEmail)}`
      );
      const data = await response.json();

      if (data.success) {
        const booking = data.data.booking;

        const existingBooking = bookings.find((b) => b.pnr === booking.pnr);
        if (!existingBooking) {
          const updatedBookings = [booking, ...bookings];
          setBookings(updatedBookings);
          setFilteredBookings(updatedBookings);

          sessionStorage.setItem(
            `booking_confirmed_${booking.pnr}`,
            JSON.stringify(booking)
          );
        }
        toast.success("Booking found and added to your list!");
        setSearchQuery("");
        setSearchEmail("");
      } else {
        toast.error(data.error || "Booking not found");
      }
    } catch (error) {
      console.error("Error searching booking:", error);
      toast.error("Failed to search booking");
    } finally {
      setIsLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700";
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700";
      case "CANCELLED":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700";
      case "UNKNOWN":
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  const viewBookingDetails = (pnr: string) => {
    router.push(`/booking/confirmation/${pnr}`);
  };

  const getOrCreateTicketForBooking = async (
    booking: Booking
  ): Promise<Ticket | null> => {
    if (!session) {
      toast.error("Please sign in to use support features");
      return null;
    }

    try {
      const ticketSubject = `Issue with Booking ${booking.pnr}: ${booking.schedule.route.origin.name} to ${booking.schedule.route.destination.name}`;

      const searchResponse = await fetch(
        `/api/tickets?search=${encodeURIComponent(ticketSubject)}`
      );
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const existingTicket = searchData.tickets.find(
          (t: Ticket) =>
            t.subject === ticketSubject && t.userId === session.user?.id
        );

        if (existingTicket) {
          return existingTicket;
        }
      }

      const createResponse = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: ticketSubject,
          description: `Customer support request for booking ${
            booking.pnr
          } from ${booking.schedule.route.origin.name} to ${
            booking.schedule.route.destination.name
          } on ${new Date(
            booking.schedule.departureTime
          ).toLocaleDateString()}`,
          category: "GENERAL",
          priority: "MEDIUM",
        }),
      });

      if (createResponse.ok) {
        const newTicket = await createResponse.json();
        return newTicket;
      } else {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error getting or creating ticket:", error);
      toast.error("Failed to initialize support ticket");
      return null;
    }
  };

  const openComments = async (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCommentsOpen(true);

    const ticket = await getOrCreateTicketForBooking(booking);
    if (ticket) {
      setAssociatedTicket(ticket);
      await loadComments(ticket);
    }
  };

  const loadComments = async (ticket: Ticket) => {
    if (!session) {
      toast.error("Please sign in to view comments");
      return;
    }

    setLoadingComments(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/comments`);
      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData);
      } else {
        throw new Error("Failed to load comments");
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const addComment = async () => {
    if (
      !newComment.trim() ||
      !session ||
      !selectedBooking ||
      !associatedTicket
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tickets/${associatedTicket.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: newComment }),
        }
      );

      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment("");
        toast.success("Comment added successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const openChat = async (booking: Booking) => {
    setSelectedBooking(booking);
    setIsChatOpen(true);

    const ticket = await getOrCreateTicketForBooking(booking);
    if (ticket) {
      setAssociatedTicket(ticket);
      await loadChatMessages(ticket);
    }
  };

  const loadChatMessages = async (ticket: Ticket) => {
    if (!session) {
      toast.error("Please sign in to use chat");
      return;
    }

    setLoadingChat(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/chat`);
      if (response.ok) {
        const chatData = await response.json();
        setChatMessages(chatData);
      } else {
        throw new Error("Failed to load chat messages");
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
      toast.error("Failed to load chat messages");
      setChatMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendChatMessage = async () => {
    if (
      !newChatMessage.trim() ||
      !session ||
      !selectedBooking ||
      !associatedTicket
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/tickets/${associatedTicket.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newChatMessage }),
      });

      if (response.ok) {
        const message = await response.json();
        setChatMessages([...chatMessages, message]);
        setNewChatMessage("");
        toast.success("Message sent successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-muted-foreground">
              Loading bookings...
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to view your bookings.
              </p>
              <Button
                onClick={() => router.push("/auth/signin")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Bookings
          </h1>
          <p className="text-muted-foreground">
            Manage and view all your bus ticket bookings
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Search Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search by PNR, Route, or Name</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Enter PNR, origin, destination, or passenger name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email (for API search)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email to search from server"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={searchBookingByEmail}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!searchQuery || !searchEmail}
                >
                  Search from Server
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🎫</div>
              <h3 className="text-lg font-semibold mb-2">No Bookings Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No bookings match your search criteria."
                  : "You haven't made any bookings yet."}
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Book Your First Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking, index) => {
              const departure = booking.schedule?.departureTime
                ? formatDateTime(booking.schedule.departureTime)
                : { date: "Unknown", time: "Unknown" };
              const bookingDate = booking.bookingDate
                ? formatDateTime(booking.bookingDate)
                : { date: "Unknown", time: "Unknown" };

              const uniqueKey =
                booking.pnr ||
                booking.id ||
                `${booking.schedule.departureTime}-${booking.totalAmount}-${index}`;

              return (
                <Card
                  key={`booking-${uniqueKey}-${index}`}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-lg">
                            {booking.schedule?.route?.origin?.name || "Unknown"}{" "}
                            →{" "}
                            {booking.schedule?.route?.destination?.name ||
                              "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {departure.date} at {departure.time}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.schedule?.operator?.name ||
                            "Unknown Operator"}{" "}
                          • {booking.schedule?.bus?.busNumber || "Unknown Bus"}
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">
                              PNR:
                            </span>
                            <div className="font-semibold">
                              {booking.pnr || "N/A"}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">
                              {booking.passengers &&
                              booking.passengers.length > 0
                                ? "Passengers:"
                                : "Passenger:"}
                            </span>
                            <div className="font-medium">
                              {booking.passengers &&
                              booking.passengers.length > 0 ? (
                                <div className="space-y-1">
                                  {booking.passengers.map(
                                    (passenger, passengerIndex) => (
                                      <div
                                        key={`${uniqueKey}-passenger-${
                                          passenger.id || passengerIndex
                                        }`}
                                        className="text-sm"
                                      >
                                        {passenger.passengerName} (Seat{" "}
                                        {passenger.seat.seatNumber})
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                booking.passengerName || "Unknown Passenger"
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">
                              Seats:
                            </span>
                            <div className="font-medium">
                              {(booking.seats || [])
                                .map((s) => s.seat?.seatNumber || "N/A")
                                .join(", ")}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <div className="space-y-2">
                          <div>
                            <Badge
                              className={getStatusColor(
                                booking.status || "UNKNOWN"
                              )}
                            >
                              {booking.status || "Unknown"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">
                              Amount:
                            </span>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              ৳{booking.totalAmount || 0}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Booked on {bookingDate.date}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2">
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() =>
                              viewBookingDetails(booking.pnr || uniqueKey)
                            }
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            size="sm"
                            disabled={!booking.pnr}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>

                          <Dialog
                            open={
                              isCommentsOpen &&
                              selectedBooking?.id === booking.id
                            }
                            onOpenChange={(open) => {
                              setIsCommentsOpen(open);
                              if (!open) {
                                setSelectedBooking(null);
                                setAssociatedTicket(null);
                                setComments([]);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => openComments(booking)}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Comment
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Comments for Booking {booking.pnr}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {loadingComments ? (
                                  <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {comments.map((comment) => (
                                      <div
                                        key={comment.id}
                                        className="border rounded-lg p-4"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-semibold">
                                              {comment.user.name ||
                                                comment.user.email}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {new Date(
                                                comment.createdAt
                                              ).toLocaleString()}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2 text-foreground">
                                          {comment.content}
                                        </div>
                                      </div>
                                    ))}
                                    {comments.length === 0 && (
                                      <div className="text-center text-muted-foreground py-4">
                                        No comments yet. Be the first to
                                        comment!
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="border-t pt-4">
                                  <Label htmlFor="comment">Add a comment</Label>
                                  <Textarea
                                    id="comment"
                                    value={newComment}
                                    onChange={(e) =>
                                      setNewComment(e.target.value)
                                    }
                                    placeholder="Type your comment here..."
                                    className="mt-2"
                                  />
                                  <Button
                                    onClick={addComment}
                                    className="mt-2 bg-blue-600 hover:bg-blue-700"
                                    disabled={
                                      !newComment.trim() || !associatedTicket
                                    }
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Post Comment
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
