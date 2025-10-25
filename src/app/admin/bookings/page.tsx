"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTicketChat } from "@/hooks/useTicketChat";
import {
  Calendar,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface Booking {
  id: string;
  pnr: string;
  status: string;
  totalAmount: number;
  bookingDate: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  schedule: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    route: {
      origin: {
        name: string;
      };
      destination: {
        name: string;
      };
    };
    bus: {
      busNumber: string;
      busType: string;
    };
  };
  seats: Array<{
    id: string;
    seat: {
      seatNumber: string;
      seatType: string;
    };
    price: number;
  }>;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  comments: Comment[];
}

export default function AdminBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [associatedTicket, setAssociatedTicket] = useState<Ticket | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const { messages, isConnected, sendMessage } = useTicketChat(
    associatedTicket?.id || null
  );

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      loadBookings();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredBookings(bookings);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bookings.filter(
        (booking) =>
          booking.pnr.toLowerCase().includes(query) ||
          booking.passengerName.toLowerCase().includes(query) ||
          booking.passengerEmail.toLowerCase().includes(query) ||
          booking.schedule.route.origin.name.toLowerCase().includes(query) ||
          booking.schedule.route.destination.name.toLowerCase().includes(query)
      );
      setFilteredBookings(filtered);
    }
  }, [searchQuery, bookings]);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/bookings");
      const data = await response.json();

      if (data.success) {
        setBookings(data.data.bookings);
        setFilteredBookings(data.data.bookings);
      } else {
        toast.error(data.error || "Failed to load bookings");
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const getOrCreateTicketForBooking = async (booking: Booking) => {
    try {
      const ticketResponse = await fetch(
        `/api/tickets?bookingId=${booking.id}`
      );
      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        if (ticketData.tickets && ticketData.tickets.length > 0) {
          return ticketData.tickets[0];
        }
      }

      const createResponse = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: `Booking ${booking.pnr} Support Request`,
          description: `Customer support request for booking ${booking.pnr} from ${booking.schedule.route.origin.name} to ${booking.schedule.route.destination.name}`,
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

  const loadComments = async (ticket: Ticket) => {
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
    if (!newComment.trim() || !associatedTicket) return;

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

  const openBookingModal = async (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);

    // Get or create ticket for this booking
    const ticket = await getOrCreateTicketForBooking(booking);
    if (ticket) {
      setAssociatedTicket(ticket);
      await loadComments(ticket);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
    setAssociatedTicket(null);
    setComments([]);
    setNewComment("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground">
            Manage all bookings and customer support requests
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>All Bookings</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No bookings match your search"
                    : "No bookings found"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PNR</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Bus</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.pnr}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {booking.passengerName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.passengerEmail}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div>
                              <div>
                                {booking.schedule.route.origin.name} →{" "}
                                {booking.schedule.route.destination.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div>
                              <div>
                                {formatDate(booking.schedule.departureTime)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {booking.schedule.bus.busNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.schedule.bus.busType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "CONFIRMED"
                                ? "default"
                                : booking.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${booking.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => openBookingModal(booking)}
                            variant="outline"
                            size="sm"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            View/Comment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Modal */}
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => !open && closeModal()}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Booking Details - {selectedBooking?.pnr}
              </DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Passenger Info
                    </h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {selectedBooking.passengerName}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedBooking.passengerEmail}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span>{" "}
                        {selectedBooking.passengerPhone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Journey Info</h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Route:</span>{" "}
                        {selectedBooking.schedule.route.origin.name} →{" "}
                        {selectedBooking.schedule.route.destination.name}
                      </p>
                      <p>
                        <span className="font-medium">Departure:</span>{" "}
                        {formatDate(selectedBooking.schedule.departureTime)}
                      </p>
                      <p>
                        <span className="font-medium">Bus:</span>{" "}
                        {selectedBooking.schedule.bus.busNumber} (
                        {selectedBooking.schedule.bus.busType})
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Selected Seats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedBooking.seats.map((seat) => (
                      <div
                        key={seat.id}
                        className="border rounded-lg p-3 flex justify-between items-center"
                      >
                        <span>Seat {seat.seat.seatNumber}</span>
                        <span className="font-medium">
                          ${seat.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Comments</h3>
                  <div className="border rounded-lg p-4 space-y-4">
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No comments yet. Be the first to add a comment.
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="border-b pb-3 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="font-medium">
                                {comment.user.name || comment.user.email}
                                {comment.user.role === "ADMIN" && (
                                  <Badge className="ml-2" variant="secondary">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-foreground">
                              {comment.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            addComment();
                          }
                        }}
                      />
                      <Button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
