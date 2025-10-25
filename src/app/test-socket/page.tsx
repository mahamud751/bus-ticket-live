"use client";

import { useState, useEffect } from "react";
import socketManager from "@/lib/socket-client";

export default function TestSocketPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("test-user-1");

  useEffect(() => {
    // Connect to socket
    socketManager.connect(userId);

    // Listen for test messages
    const messageListener = (data: unknown) => {
      if (
        typeof data !== "object" ||
        data === null ||
        !("text" in data) ||
        !("from" in data)
      )
        return;
      const typedData = data as { text: string; from: string };
      console.log("Received test message:", typedData);
      setMessages((prev) => [
        ...prev,
        `Received: ${JSON.stringify(typedData)}`,
      ]);
    };
    socketManager.on("test-message", messageListener);

    // Listen for connection events
    const connectListener = (...args: unknown[]) => {
      console.log("Socket connected");
      setMessages((prev) => [...prev, "Socket connected"]);
    };
    socketManager.on("connect", connectListener);

    const disconnectListener = (...args: unknown[]) => {
      console.log("Socket disconnected");
      setMessages((prev) => [...prev, "Socket disconnected"]);
    };
    socketManager.on("disconnect", disconnectListener);

    return () => {
      socketManager.off("test-message", messageListener);
      socketManager.off("connect", connectListener);
      socketManager.off("disconnect", disconnectListener);
    };
  }, [userId]);

  const sendMessage = () => {
    if (input.trim()) {
      socketManager.emit("test-message", { text: input, from: userId });
      setMessages((prev) => [...prev, `Sent: ${input}`]);
      setInput("");
    }
  };

  const switchUser = () => {
    const newUserId = userId === "test-user-1" ? "test-user-2" : "test-user-1";
    setUserId(newUserId);
    socketManager.disconnect();
    setTimeout(() => {
      socketManager.connect(newUserId);
    }, 100);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Socket Test Page</h1>
      <div className="mb-4">
        <p>Current User ID: {userId}</p>
        <button
          onClick={switchUser}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Switch User
        </button>
        <button
          onClick={() => socketManager.disconnect()}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Disconnect
        </button>
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter message"
          className="border p-2 mr-2"
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Send Message
        </button>
      </div>
      <div className="border p-4 h-64 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">Messages:</h2>
        {messages.map((msg, index) => (
          <div key={index} className="mb-1">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
