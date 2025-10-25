import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import { Chat } from "@prisma/client";

let socket: ReturnType<typeof io> | null = null;

export const useTicketChat = (ticketId: string | null) => {
  const [messages, setMessages] = useState<Chat[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);

  const connect = useCallback(() => {
    if (!ticketId) return;

    if (!socket) {
      const newSocket = io({
        path: "/api/socketio",
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 20000,
      });

      socket = newSocket;
      const socketRef = socket;

      if (socketRef) {
        socketRef.on("connect", () => {
          setIsConnected(true);
          console.log("Connected to chat server");

          if (ticketId) {
            socketRef.emit("join-ticket-chat", ticketId);
          }
        });

        socketRef.on("disconnect", (reason: string) => {
          setIsConnected(false);
          console.log("Disconnected from chat server, reason:", reason);

          if (reason === "io server disconnect") {
            socketRef.connect();
          }
        });

        socketRef.on("connect_error", (error: unknown) => {
          console.error("Connection error:", error);
          setIsConnected(false);
        });
      }
    }

    if (socket) {
      socket.emit("join-ticket-chat", ticketId);
    }

    const handleMessage = (data: { ticketId: string; message: Chat }) => {
      if (data.ticketId === ticketId) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleMessageSent = (data: { ticketId: string; message: Chat }) => {
      if (data.ticketId === ticketId) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    if (socket) {
      socket.on("receive-ticket-message", handleMessage);
      socket.on("message-sent", handleMessageSent);
    }

    const loadInitialMessages = async () => {
      if (ticketId && !initialMessagesLoaded) {
        try {
          const response = await fetch(`/api/tickets/${ticketId}/chat`);
          if (response.ok) {
            const initialMessages = await response.json();
            setMessages(initialMessages);
            setInitialMessagesLoaded(true);
          }
        } catch (error) {
          console.error("Failed to load initial messages:", error);
        }
      }
    };

    loadInitialMessages();

    // Cleanup function
    return () => {
      if (socket) {
        socket.off("receive-ticket-message", handleMessage);
        socket.off("message-sent", handleMessageSent);
        socket.emit("leave-ticket-chat", ticketId);
      }
    };
  }, [ticketId, initialMessagesLoaded]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!socket || !ticketId) return;

      // Create a temporary message object to show immediately in the UI
      const tempMessage = {
        id: `temp-${Date.now()}`,
        content,
        ticketId,
        userId: "", // Will be filled by the server
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Chat;

      // Immediately add to UI to provide instant feedback
      setMessages((prev) => [...prev, tempMessage]);

      try {
        // Send message to the server API
        const response = await fetch(`/api/tickets/${ticketId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        if (response.ok) {
          const savedMessage = await response.json();

          // Replace the temporary message with the saved one
          setMessages((prev) =>
            prev.map((msg) => (msg.id === tempMessage.id ? savedMessage : msg))
          );
        } else {
          // Remove the temporary message if the API call failed
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== tempMessage.id)
          );
          console.error("Failed to send message");
        }
      } catch (error) {
        // Remove the temporary message if there was an error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
        console.error("Error sending message:", error);
      }

      // Also emit the message to the server via socket for real-time delivery
      socket.emit("send-ticket-message", {
        ticketId,
        message: {
          content,
          createdAt: new Date().toISOString(),
        },
      });
    },
    [ticketId]
  );

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (ticketId) {
      connect();
    }

    return () => {
      if (ticketId) {
        if (socket) {
          socket.emit("leave-ticket-chat", ticketId);
        }
      }
    };
  }, [ticketId, connect]);

  return {
    messages,
    isConnected,
    sendMessage,
    connect,
    disconnect,
  };
};
