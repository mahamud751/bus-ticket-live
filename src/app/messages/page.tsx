"use client";

import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import socketManager from "@/lib/socket-client";
import { UserRole } from "@prisma/client";
import { MessageCircle, Plus, Search, Send, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  attachment: string | null;
  userId: string;
  user: User;
  comments: Comment[];
  chats: Chat[];
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

interface Chat {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

interface MessageThread {
  id: string;
  ticketId: string;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  user: User;
  status: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  type: "comment" | "chat";
  user: User;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  userId: string;
  ticketId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  console.log("Session status:", status);
  if (session) {
    console.log("Session data:", session.user);
  }

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const socketRef = useRef(null);
  const initializedRef = useRef(false);
  const currentTicketRoomRef = useRef<string | null>(null);
  const selectedThreadRef = useRef<MessageThread | null>(null);
  const isFetchingThreads = useRef(false);
  const hasFetchedThreads = useRef(false);

  useEffect(() => {
    selectedThreadRef.current = selectedThread;
  }, [selectedThread]);

  const applySearchFilter = useCallback(
    (query: string, threads: MessageThread[]) => {
      if (!query.trim()) {
        setFilteredThreads(threads);
        return;
      }

      const filtered = threads.filter(
        (thread) =>
          thread.ticketId.toLowerCase().includes(query.toLowerCase()) ||
          thread.subject.toLowerCase().includes(query.toLowerCase()) ||
          (thread.user.name &&
            thread.user.name.toLowerCase().includes(query.toLowerCase())) ||
          (thread.user.email &&
            thread.user.email.toLowerCase().includes(query.toLowerCase()))
      );

      setFilteredThreads(filtered);
    },
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    applySearchFilter(query, messageThreads);
  };

  const fetchMessageThreads = useCallback(async () => {
    console.log("fetchMessageThreads called, session:", !!session);

    if (!session) {
      console.log("No session, stopping loading");
      setLoading(false);
      return;
    }

    if (isFetchingThreads.current) {
      console.log(
        "Skipping fetch - isFetchingThreads:",
        isFetchingThreads.current
      );
      return;
    }

    isFetchingThreads.current = true;
    try {
      setLoading(true);

      const url = "/api/tickets?hasChats=true";

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const threads: MessageThread[] = data.tickets.map((ticket: Ticket) => ({
          id: ticket.id,
          ticketId: ticket.id,
          subject: ticket.subject,
          lastMessage:
            ticket.chats.length > 0
              ? ticket.chats[0].content
              : ticket.comments.length > 0
              ? ticket.comments[0].content
              : "Ticket created - Start a conversation by sending a message",
          lastMessageTime: ticket.updatedAt,
          unreadCount: 0,
          user: ticket.user,
          status: ticket.status,
        }));

        console.log("Transformed threads:", threads);
        setMessageThreads(threads);

        applySearchFilter(searchQuery, threads);

        if (threads.length > 0 && !selectedThread) {
          console.log("Selecting first thread:", threads[0]);
          setSelectedThread(threads[0]);
        }

        hasFetchedThreads.current = false;
      } else {
        throw new Error(data.error || "Failed to fetch tickets");
      }
    } catch (error) {
      toast.error("Failed to load messages");

      hasFetchedThreads.current = false;
    } finally {
      isFetchingThreads.current = false;
      setLoading(false);
    }
  }, [searchQuery, selectedThread, session]);

  useEffect(() => {
    console.log("Socket useEffect running with dependencies:", {
      status,
      session: !!session,
    });

    if (status === "loading") {
      console.log("Session is loading...");
      return;
    }

    if (!session) {
      console.log("No session, stopping loading");
      setLoading(false);
      return;
    }

    console.log(
      "Initializing socket connection for user:",
      session?.user?.id || "no-user"
    );
    socketManager.connect(session?.user?.id || "no-user");

    setTimeout(() => {
      if (socketManager.isConnected() && session?.user?.id) {
        console.log("Joining user room:", session.user.id);
        socketManager.emit("join-user", session.user.id);
      }

      if (socketManager.isConnected()) {
        console.log("Requesting presence state after connection");
        socketManager.emit("request-presence");
      }
    }, 1000);

    const messageListener = (data: unknown) => {
      if (
        typeof data !== "object" ||
        data === null ||
        !("ticketId" in data) ||
        !("message" in data)
      )
        return;
      const typedData = data as { ticketId: string; message: Chat };
      console.log("Received message in listener:", data);

      if (
        selectedThreadRef.current &&
        typedData.ticketId === selectedThreadRef.current.ticketId
      ) {
        console.log("Adding message to current thread");
        setMessages((prev) => [
          ...prev,
          { ...typedData.message, type: "chat" },
        ]);
      }

      setMessageThreads((prevThreads) => {
        const updatedThreads = prevThreads.map((thread) =>
          thread.ticketId === typedData.ticketId
            ? {
                ...thread,
                lastMessage: typedData.message.content,
                lastMessageTime: typedData.message.createdAt,
              }
            : thread
        );

        applySearchFilter(searchQuery, updatedThreads);
        return updatedThreads;
      });

      scrollToBottom();
    };
    socketManager.on("receive-ticket-message", messageListener);

    const presenceListener = (data: unknown) => {
      if (
        typeof data !== "object" ||
        data === null ||
        !("onlineUserIds" in data)
      )
        return;
      const typedData = data as { onlineUserIds: string[] };
      setOnlineUsers(new Set(typedData.onlineUserIds));
    };
    socketManager.on("presence-state", presenceListener);

    const userOnlineListener = (data: unknown) => {
      if (typeof data !== "object" || data === null || !("userId" in data))
        return;
      const typedData = data as { userId: string };
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(typedData.userId);
        return next;
      });
    };
    socketManager.on("user-online", userOnlineListener);

    const userOfflineListener = (data: unknown) => {
      if (typeof data !== "object" || data === null || !("userId" in data))
        return;
      const typedData = data as { userId: string };
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(typedData.userId);
        return next;
      });
    };
    socketManager.on("user-offline", userOfflineListener);

    const notificationListener = (data: unknown) => {
      if (
        typeof data !== "object" ||
        data === null ||
        !("notification" in data)
      )
        return;
      const typedData = data as { notification: Notification };
      console.log("New notification received:", typedData);
    };
    socketManager.on("new-notification", notificationListener);

    const messageReadListener = (data: unknown) => {
      if (typeof data !== "object" || data === null || !("totalUnread" in data))
        return;
      const typedData = data as { totalUnread: number };
    };
    socketManager.on("messages-read", messageReadListener);

    setTimeout(() => {
      socketManager.emit("request-presence");
    }, 1500);

    const presenceInterval = setInterval(() => {
      if (socketManager.isConnected()) {
        socketManager.emit("request-presence");
      }
    }, 30000);

    hasFetchedThreads.current = false;

    setTimeout(() => {
      fetchMessageThreads();
    }, 500);

    return () => {
      console.log("Cleaning up socket connection");

      socketManager.off("receive-ticket-message", messageListener);
      socketManager.off("presence-state", presenceListener);
      socketManager.off("user-online", userOnlineListener);
      socketManager.off("user-offline", userOfflineListener);
      socketManager.off("new-notification", notificationListener);
      socketManager.off("messages-read", messageReadListener);

      clearInterval(presenceInterval);

      hasFetchedThreads.current = false;
      isFetchingThreads.current = false;

      if (currentTicketRoomRef.current) {
        socketManager.emit("leave-ticket-chat", currentTicketRoomRef.current);
      }

      if (session?.user?.id) {
        socketManager.emit("leave-user", session.user.id);
      }
    };
  }, [status, fetchMessageThreads, session]);

  useEffect(() => {
    if (!selectedThread || !session) {
      console.log("No selected thread or session, not joining any room");
      return;
    }

    if (
      currentTicketRoomRef.current &&
      currentTicketRoomRef.current !== selectedThread.ticketId
    ) {
      socketManager.emit("leave-ticket-chat", currentTicketRoomRef.current);
    }

    socketManager.emit("join-ticket-chat", selectedThread.ticketId);
    currentTicketRoomRef.current = selectedThread.ticketId;

    markThreadAsRead(selectedThread);

    fetchMessagesForThread(selectedThread);

    return () => {
      if (currentTicketRoomRef.current) {
        socketManager.emit("leave-ticket-chat", currentTicketRoomRef.current);
        currentTicketRoomRef.current = null;
      }
    };
  }, [selectedThread, session]);

  const markThreadAsRead = async (thread: MessageThread) => {
    try {
      const response = await fetch("/api/messages/mark-as-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketId: thread.ticketId }),
      });

      if (response.ok) {
        const data = await response.json();
        socketManager.emit("messages-read", {
          totalUnread: data.totalUnread,
        });
      }
    } catch (error) {
      console.error("Error marking thread as read:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log("State changed:", {
      messageThreads: messageThreads.length,
      filteredThreads: filteredThreads.length,
      loading,
      selectedThread,
    });
  }, [messageThreads, filteredThreads, loading, selectedThread]);

  const fetchMessagesForThread = async (thread: MessageThread) => {
    try {
      console.log("Fetching messages for thread:", thread.ticketId);

      const chatResponse = await fetch(`/api/tickets/${thread.ticketId}/chat`);

      const chatData = await chatResponse.json();

      if (chatResponse.ok) {
        const chatMessages: Message[] = chatData
          .map((c: Chat) => ({
            ...c,
            type: "chat" as const,
          }))
          .sort(
            (a: Message, b: Message) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        setMessages(chatMessages);
        setSelectedThread(thread);

        markThreadAsRead(thread);

        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        throw new Error("Failed to fetch messages");
      }
    } catch (error) {
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !session) return;

    try {
      setSending(true);
      console.log(
        "Sending message:",
        newMessage,
        "to ticket:",
        selectedThread.ticketId
      );

      const endpoint = `/api/tickets/${selectedThread.ticketId}/chat`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newMessage }),
      });

      console.log("Message send response:", response.status);

      if (response.ok) {
        const message = await response.json();
        console.log("Message sent successfully:", message);

        setNewMessage("");
        toast.success("Message sent successfully");

        setMessageThreads((prevThreads) => {
          const updatedThreads = prevThreads.map((thread) =>
            thread.id === selectedThread.id
              ? {
                  ...thread,
                  lastMessage: newMessage,
                  lastMessageTime: new Date().toISOString(),
                }
              : thread
          );

          applySearchFilter(searchQuery, updatedThreads);
          return updatedThreads;
        });

        socketManager.emit("send-ticket-message", {
          ticketId: selectedThread.ticketId,
          message: message,
        });

        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const createNewSupportTicket = async () => {
    if (!session) return;

    if (session.user.role !== UserRole.USER) {
      toast.error("Only users can create support tickets");
      return;
    }

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: "General Support Request",
          description: "I need help with the bus ticketing system.",
          category: "GENERAL",
          priority: "MEDIUM",
        }),
      });

      if (response.ok) {
        const newTicket: Ticket = await response.json();

        const newThread: MessageThread = {
          id: newTicket.id,
          ticketId: newTicket.id,
          subject: newTicket.subject,
          lastMessage:
            "Ticket created - Start a conversation by sending a message",
          lastMessageTime: newTicket.createdAt,
          unreadCount: 0,
          user: newTicket.user,
          status: newTicket.status,
        };

        setMessageThreads((prevThreads) => {
          const updatedThreads = [newThread, ...prevThreads];
          applySearchFilter(searchQuery, updatedThreads);
          return updatedThreads;
        });

        setSelectedThread(newThread);
        setMessages([]);

        toast.success("New support ticket created!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating support ticket:", error);
      toast.error("Failed to create support ticket");
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-muted-foreground">
              Loading messages...
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                Authentication Required
              </h2>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your messages.
              </p>
              <Button onClick={() => router.push("/auth/signin")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>

          {session.user.role === UserRole.USER && (
            <Button
              onClick={createNewSupportTicket}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Support Ticket
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Message Threads List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Conversations
                </CardTitle>
                {/* Search input for admins */}
                {session.user.role === UserRole.ADMIN && (
                  <div className="mt-4 relative">
                    <Input
                      placeholder="Search by booking ID..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading conversations...
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchQuery ? (
                      "No conversations match your search."
                    ) : session.user.role === UserRole.USER ? (
                      <>
                        <p className="mb-4">No conversations yet.</p>
                        <Button
                          onClick={createNewSupportTicket}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Support Ticket
                        </Button>
                      </>
                    ) : (
                      "No conversations yet. Users need to start a conversation first."
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredThreads.map((thread) => {
                      const otherUserId = thread.user.id;
                      const isOnline = onlineUsers.has(otherUserId);

                      return (
                        <div
                          key={thread.id}
                          className={`p-4 cursor-pointer hover:bg-muted ${
                            selectedThread?.id === thread.id ? "bg-muted" : ""
                          }`}
                          onClick={() => {
                            setSelectedThread(thread);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-sm">
                              {thread.subject}
                            </div>
                            {thread.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {thread.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center mt-1">
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-2 ${
                                  isOnline ? "bg-green-500" : "bg-red-500"
                                }`}
                              ></div>
                              <div className="text-xs text-muted-foreground truncate">
                                {thread.user.name || thread.user.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {thread.lastMessage}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Booking ID: {thread.ticketId.substring(0, 8)}...
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(
                              thread.lastMessageTime
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedThread ? (
                    <div className="flex items-center justify-between">
                      <span>{selectedThread.subject}</span>
                      {selectedThread.user && (
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-2 ${
                              onlineUsers.has(selectedThread.user.id)
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                          <span className="text-sm font-normal">
                            {onlineUsers.has(selectedThread.user.id)
                              ? "Online"
                              : "Offline"}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    "Select a conversation"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedThread ? (
                  <div className="flex flex-col h-[500px]">
                    <div
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto mb-4 p-4 border rounded-lg bg-muted/50"
                    >
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                          <MessageCircle className="h-12 w-12 mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium mb-2">
                            Start a conversation
                          </h3>
                          <p className="mb-4">
                            This is the beginning of your conversation with
                            support. Send a message to get help.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.user.id === session.user.id
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.user.id === session.user.id
                                    ? "bg-blue-600 text-white dark:bg-blue-700"
                                    : "bg-white border dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                }`}
                              >
                                <div className="text-xs font-medium mb-1">
                                  {message.user.id === session.user.id
                                    ? "You"
                                    : message.user.name || message.user.email}
                                </div>
                                <div>{message.content}</div>
                                <div className="text-xs mt-1 opacity-70 dark:opacity-90">
                                  {new Date(
                                    message.createdAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-[500px] flex flex-col items-center justify-center text-center text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mb-4 text-gray-300" />
                    <h3 className="text-xl font-medium mb-2">
                      No conversation selected
                    </h3>
                    <p className="mb-4">
                      Select a conversation from the list or create a new
                      support ticket to start chatting.
                    </p>
                    {session.user.role === UserRole.USER && (
                      <Button
                        onClick={createNewSupportTicket}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Support Ticket
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
