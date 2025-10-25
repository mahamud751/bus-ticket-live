"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  Comment,
} from "@prisma/client";
import io from "socket.io-client";
import Header from "@/components/Header";

interface TicketWithDetails extends Ticket {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  comments: (Comment & {
    user: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    };
  })[];
}

interface CommentWithUser extends Comment {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);

  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setTicketId(resolvedParams.id);
    };

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!ticketId) return;

    const newSocket = io({
      path: "/api/socketio",
    });

    newSocket.on("connect", () => {
      newSocket.emit("join-ticket-chat", ticketId);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    newSocket.on("new-comment", (data: { comment: CommentWithUser }) => {
      console.log("Received new comment:", data);
      if (ticket && data.comment.ticketId === ticket.id) {
        setTicket({
          ...ticket,
          comments: [...ticket.comments, data.comment],
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave-ticket-chat", ticketId);
      newSocket.disconnect();
    };
  }, [ticketId, ticket]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if (ticketId) {
      fetchTicket();
    }
  }, [session, status, router, ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${ticketId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Ticket not found");
        } else if (response.status === 403) {
          throw new Error("Access denied");
        } else {
          throw new Error("Failed to fetch ticket");
        }
      }

      const data = await response.json();
      setTicket(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const comment = await response.json();

      // Update the ticket with the new comment
      if (ticket) {
        setTicket({
          ...ticket,
          comments: [...ticket.comments, comment],
        });
      }

      setNewComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "RESOLVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case "LOW":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "URGENT":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getCategoryColor = (category: TicketCategory) => {
    switch (category) {
      case "GENERAL":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "TECHNICAL":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "BILLING":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      case "ACCOUNT":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
      case "FEEDBACK":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <header className="bg-white shadow dark:bg-gray-800">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Support Ticket
            </h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
                <h2 className="text-red-800 font-bold text-lg dark:text-red-200">
                  Error
                </h2>
                <p className="text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={fetchTicket}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <header className="bg-white shadow dark:bg-gray-800">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Support Ticket
            </h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <header className="bg-white shadow dark:bg-gray-800">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Support Ticket
            </h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow p-8 text-center dark:bg-gray-800">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                  Ticket not found
                </h3>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  The ticket you&apos;re looking for doesn&apos;t exist or you
                  don&apos;t have permission to view it.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push("/tickets")}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    Back to Tickets
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <header className="bg-white shadow dark:bg-gray-800">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Support Ticket
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
              <button
                onClick={() => router.push("/tickets")}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400 dark:hover:text-blue-300"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Tickets
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg dark:bg-gray-800">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {ticket.subject}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                      Ticket details and activity
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority}
                    </span>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(
                        ticket.category
                      )}`}
                    >
                      {ticket.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Description
                    </h4>
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap dark:text-gray-300">
                      {ticket.description}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Ticket Information
                    </h4>
                    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Created by
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {ticket.user.name || ticket.user.email}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Created on
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Last updated
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {new Date(ticket.updatedAt).toLocaleString()}
                        </dd>
                      </div>
                      {ticket.attachment && (
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Attachment
                          </dt>
                          <dd className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                            <a
                              href={ticket.attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              View Attachment
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Comments
                    </h4>
                    <div className="mt-4 space-y-6">
                      {ticket.comments.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No comments yet.
                        </p>
                      ) : (
                        <ul className="space-y-4">
                          {ticket.comments.map((comment) => (
                            <li
                              key={comment.id}
                              className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700"
                            >
                              <div className="flex justify-between">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {comment.user.name || comment.user.email}
                                  {comment.user.role === "ADMIN" && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                {comment.content}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <form onSubmit={handleAddComment} className="mt-6">
                        <div>
                          <label
                            htmlFor="comment"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Add a comment
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="comment"
                              rows={3}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              placeholder="Add your comment here..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            type="submit"
                            disabled={isSubmitting || !newComment.trim()}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {isSubmitting ? "Adding..." : "Add Comment"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
