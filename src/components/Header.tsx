"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  User,
  MapPin,
  Settings,
  Home,
  Calendar,
  Search,
  MessageCircle,
  QrCode,
  Bell,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import AnimatedBus from "./AnimatedBus";
import React from "react";
import socketManager from "@/lib/socket-client";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const initializedRef = useRef(false);

  // Fetch real unread notification and message counts
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      // Reset counts when user logs out
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    // Only initialize once per session
    if (!initializedRef.current) {
      initializedRef.current = true;

      const fetchCounts = async () => {
        try {
          // Fetch notification count (comments)
          const notificationResponse = await fetch(
            "/api/notifications?limit=1"
          );
          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            setUnreadNotifications(notificationData.totalUnread);
          }

          // Fetch message count (chat)
          const messageResponse = await fetch("/api/messages/unread-count");
          if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            setUnreadMessages(messageData.totalUnread);
          }
        } catch (error) {
          console.error("Failed to fetch counts:", error);
        }
      };

      fetchCounts();

      // Connect to socket using shared manager - only connect once
      console.log("Header connecting socket for user:", session.user.id);
      socketManager.connect(session.user.id);

      // Listen for presence updates
      const presenceListener = (data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("onlineUserIds" in data)
        )
          return;
        const typedData = data as { onlineUserIds: string[] };
        // We could update online status if needed, but for header we just need notifications
      };
      socketManager.on("presence-state", presenceListener);

      const userOnlineListener = (data: unknown) => {
        if (typeof data !== "object" || data === null || !("userId" in data))
          return;
        const typedData = data as { userId: string };
        // User came online, but we don't need to do anything in header
      };
      socketManager.on("user-online", userOnlineListener);

      const userOfflineListener = (data: unknown) => {
        if (typeof data !== "object" || data === null || !("userId" in data))
          return;
        const typedData = data as { userId: string };
        // User went offline, but we don't need to do anything in header
      };
      socketManager.on("user-offline", userOfflineListener);

      // Listen for new notifications
      const notificationListener = () => {
        // Increment notification count
        setUnreadNotifications((prev) => prev + 1);
      };
      socketManager.on("new-notification", notificationListener);

      // Listen for new chat messages
      const messageListener = () => {
        // Increment message count
        setUnreadMessages((prev) => prev + 1);
      };
      socketManager.on("receive-ticket-message", messageListener);

      // Listen for notification read events
      const notificationReadListener = (data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("totalUnread" in data)
        )
          return;
        const typedData = data as { totalUnread: number };
        setUnreadNotifications(typedData.totalUnread);
      };
      socketManager.on("notifications-read", notificationReadListener);

      // Listen for message read events
      const messageReadListener = (data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("totalUnread" in data)
        )
          return;
        const typedData = data as { totalUnread: number };
        setUnreadMessages(typedData.totalUnread);
      };
      socketManager.on("messages-read", messageReadListener);

      // Poll for updates every 60 seconds (increased from 30) and only if document is visible
      const interval = setInterval(() => {
        // Only fetch if the document is visible to avoid unnecessary calls
        if (document.visibilityState === "visible") {
          fetchCounts();
        }
      }, 60000); // Increased to 60 seconds

      return () => {
        clearInterval(interval);
        // Clean up socket listeners
        socketManager.off("presence-state", presenceListener);
        socketManager.off("user-online", userOnlineListener);
        socketManager.off("user-offline", userOfflineListener);
        socketManager.off("new-notification", notificationListener);
        socketManager.off("receive-ticket-message", messageListener);
        socketManager.off("notifications-read", notificationReadListener);
        socketManager.off("messages-read", messageReadListener);
        // Don't disconnect the socket here as it might be used by other components
        initializedRef.current = false;
      };
    }
  }, [session, status]);

  return (
    <>
      <header className="bg-white dark:bg-gray-900 shadow-lg border-b dark:border-gray-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <MapPin className="h-8 w-8 text-blue-600" />
                </motion.div>
                <motion.span
                  className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                >
                  BusTicket
                </motion.span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/my-bookings"
                  className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  My Bookings
                </Link>

                <Link
                  href="/qr-scanner"
                  className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  QR Scanner
                </Link>
                <Link
                  href="/support"
                  className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Support
                </Link>
              </div>
            </div>

            {/* User Actions */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 space-x-2">
                {/* Notification Icon for Authenticated Users */}
                {session && (
                  <button
                    onClick={() => router.push("/notifications")}
                    className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                )}

                {/* Message Icon for Authenticated Users */}
                {session && (
                  <button
                    onClick={() => router.push("/messages")}
                    className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadMessages}
                      </span>
                    )}
                  </button>
                )}

                <LanguageToggle />
                <ThemeToggle />
                {status === "loading" ? (
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                ) : session ? (
                  <div className="flex items-center space-x-4">
                    {session.user.role === "ADMIN" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/admin")}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Hello, {session.user.name?.split(" ")[0]}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => signOut()}>
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/auth/signin")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                    <Button
                      size="sm"
                      className="ml-2"
                      onClick={() => router.push("/auth/signup")}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button - REMOVED */}
          </div>
        </div>

        {/* Mobile Navigation - REMOVED */}
      </header>

      {/* Animated Bus Section */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`cloud-${i}`}
              className="absolute bg-white opacity-20 rounded-full"
              style={{
                width: Math.random() * 60 + 20,
                height: Math.random() * 20 + 10,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, 30, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        <AnimatedBus />
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}

// Mobile Bottom Navigation Component
function MobileBottomNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const initializedRef = useRef(false);

  // Fetch real unread notification and message counts
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      // Reset counts when user logs out
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    // Only initialize once per session
    if (!initializedRef.current) {
      initializedRef.current = true;

      const fetchCounts = async () => {
        try {
          // Fetch notification count (comments)
          const notificationResponse = await fetch(
            "/api/notifications?limit=1"
          );
          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            setUnreadNotifications(notificationData.totalUnread);
          }

          // Fetch message count (chat)
          const messageResponse = await fetch("/api/messages/unread-count");
          if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            setUnreadMessages(messageData.totalUnread);
          }
        } catch (error) {
          console.error("Failed to fetch counts:", error);
        }
      };

      fetchCounts();

      // Connect to socket using shared manager - only connect once
      console.log(
        "MobileBottomNav connecting socket for user:",
        session.user.id
      );
      socketManager.connect(session.user.id);

      // Listen for presence updates
      const presenceListener = (data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("onlineUserIds" in data)
        )
          return;
        const typedData = data as { onlineUserIds: string[] };
        // We could update online status if needed, but for header we just need notifications
      };
      socketManager.on("presence-state", presenceListener);

      const userOnlineListener = (data: unknown) => {
        if (typeof data !== "object" || data === null || !("userId" in data))
          return;
        const typedData = data as { userId: string };
        // User came online, but we don't need to do anything in header
      };
      socketManager.on("user-online", userOnlineListener);

      const userOfflineListener = (data: unknown) => {
        if (typeof data !== "object" || data === null || !("userId" in data))
          return;
        const typedData = data as { userId: string };
        // User went offline, but we don't need to do anything in header
      };
      socketManager.on("user-offline", userOfflineListener);

      // Listen for new notifications
      const notificationListener = () => {
        // Increment notification count
        setUnreadNotifications((prev) => prev + 1);
      };
      socketManager.on("new-notification", notificationListener);

      // Listen for new chat messages
      const messageListener = () => {
        // Increment message count
        setUnreadMessages((prev) => prev + 1);
      };
      socketManager.on("receive-ticket-message", messageListener);

      // Listen for notification read events
      const notificationReadListener = (data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("totalUnread" in data)
        )
          return;
        const typedData = data as { totalUnread: number };
        setUnreadNotifications(typedData.totalUnread);
      };
      socketManager.on("notifications-read", notificationReadListener);

      // Listen for message read events
      const messageReadListener = (data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("totalUnread" in data)
        )
          return;
        const typedData = data as { totalUnread: number };
        setUnreadMessages(typedData.totalUnread);
      };
      socketManager.on("messages-read", messageReadListener);

      // Poll for updates every 60 seconds (increased from 30) and only if document is visible
      const interval = setInterval(() => {
        // Only fetch if the document is visible to avoid unnecessary calls
        if (document.visibilityState === "visible") {
          fetchCounts();
        }
      }, 60000); // Increased to 60 seconds

      return () => {
        clearInterval(interval);
        // Clean up socket listeners
        socketManager.off("presence-state", presenceListener);
        socketManager.off("user-online", userOnlineListener);
        socketManager.off("user-offline", userOfflineListener);
        socketManager.off("new-notification", notificationListener);
        socketManager.off("receive-ticket-message", messageListener);
        socketManager.off("notifications-read", notificationReadListener);
        socketManager.off("messages-read", messageReadListener);
        // Don't disconnect the socket here as it might be used by other components
        initializedRef.current = false;
      };
    }
  }, [session, status]);

  // Update active tab based on current route
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/") setActiveTab("home");
      else if (path === "/search") setActiveTab("search");
      else if (path === "/my-bookings") setActiveTab("bookings");
      else if (path === "/support") setActiveTab("support");
      else if (path === "/qr-scanner") setActiveTab("qr-scanner");
      else if (path === "/messages") setActiveTab("messages");
      else if (path === "/notifications") setActiveTab("notifications");
      else if (path.includes("/auth")) setActiveTab("profile");
    }
  }, []);

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      href: "/",
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      href: "/search",
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      href: "/my-bookings",
    },

    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      href: "/notifications",
    },
    {
      id: "messages",
      label: "Messages",
      icon: Mail,
      href: "/messages",
    },
    {
      id: "qr-scanner",
      label: "QR Scan",
      icon: QrCode,
      href: "/qr-scanner",
    },
  ];

  const handleNavClick = (item: (typeof navItems)[0]) => {
    setActiveTab(item.id);
    router.push(item.href);
  };

  const handleAuthAction = () => {
    if (session) {
      signOut();
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <motion.nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-pb"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between py-2 px-2">
        {/* Left side navigation items */}
        <div className="flex items-center justify-around flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-0 flex-1 touch-manipulation transition-all duration-200 relative ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50"
                    : "text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-muted"
                }`}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.1 }}
              >
                <Icon
                  className={`h-6 w-6 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                  }`}
                />
                {item.id === "notifications" && unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4">
                    {unreadNotifications}
                  </span>
                )}
                {item.id === "messages" && unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4">
                    {unreadMessages}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Right side auth button */}
        <motion.button
          onClick={handleAuthAction}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-0 touch-manipulation text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 ml-2"
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1 }}
        >
          <User className="h-6 w-6" />
        </motion.button>
      </div>
    </motion.nav>
  );
}
