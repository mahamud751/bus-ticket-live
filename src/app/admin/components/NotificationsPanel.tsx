"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
  ticket?: {
    id: string;
    subject: string;
    status: string;
  } | null;
}

export default function NotificationsPanel() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=10");
      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications);
      } else {
        throw new Error(data.error || "Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAsRead(true);
      const response = await fetch("/api/notifications/mark-as-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
        toast.success("All notifications marked as read");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to mark notifications as read");
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("Failed to mark notifications as read");
    } finally {
      setMarkingAsRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.ticket) {
      router.push(`/tickets/${notification.ticket.id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-3 bg-muted rounded-lg animate-pulse"
              >
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </span>
          {notifications.some((n) => !n.read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAsRead}
            >
              {markingAsRead ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Mark All as Read"
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                  notification.read
                    ? "bg-background"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                } ${getNotificationColor(notification.type)}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-foreground truncate">
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <Badge variant="default" className="ml-2">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  {notification.ticket && (
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      <span className="font-medium">Ticket:</span>
                      <span className="ml-1 truncate">
                        {notification.ticket.subject}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </span>
                    {notification.ticket && (
                      <Badge variant="secondary" className="text-xs">
                        {notification.ticket.status.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
