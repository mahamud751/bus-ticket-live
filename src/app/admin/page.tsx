"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import NotificationsPanel from "./components/NotificationsPanel";

interface AnalyticsData {
  overview: {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    conversionRate: number;
  };
  topRoutes: Array<{
    scheduleId: string;
    bookings: number;
    revenue: number;
    route: {
      origin: string;
      destination: string;
      operator: string;
      departureTime: string;
    } | null;
  }>;
  operatorStats: Array<{
    operatorId: string;
    operatorName: string;
    bookings: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("today");

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        toast.error(data.error || "Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth/signin");
      return;
    }

    fetchAnalytics();
  }, [session, status, router, period, fetchAnalytics]);

  const formatCurrency = (amount: number) => {
    return `৳${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-8">
            You don&apos;t have permission to access this page.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header removed as it's now in the layout */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-0">
        {analytics ? (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Bookings
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {analytics.overview.totalBookings}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Revenue
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {formatCurrency(analytics.overview.totalRevenue)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Conversion Rate
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {analytics.overview.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                      <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Pending Bookings
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {analytics.overview.pendingBookings}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                      <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications Panel */}
            <NotificationsPanel />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/admin/schedules")}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Calendar className="h-6 w-6 mb-2" />
                    Manage Schedules
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push("/admin/routes")}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <MapPin className="h-6 w-6 mb-2" />
                    Manage Routes
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push("/admin/analytics")}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <BarChart3 className="h-6 w-6 mb-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Routes */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topRoutes.slice(0, 5).map((route, index) => (
                      <div
                        key={route.scheduleId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </div>
                          <div>
                            {route.route ? (
                              <>
                                <div className="font-medium">
                                  {route.route.origin} →{" "}
                                  {route.route.destination}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {route.route.operator} •{" "}
                                  {formatDate(route.route.departureTime)}
                                </div>
                              </>
                            ) : (
                              <div className="font-medium">Unknown Route</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {route.bookings} bookings
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(route.revenue)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Operator Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Operator Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.operatorStats
                      .slice(0, 5)
                      .map((operator, index) => (
                        <div
                          key={operator.operatorId}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-400">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">
                                {operator.operatorName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {operator.bookings} bookings
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(operator.revenue)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analytics.overview.confirmedBookings}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confirmed
                    </div>
                    <Badge variant="default" className="mt-2">
                      {analytics.overview.totalBookings > 0
                        ? (
                            (analytics.overview.confirmedBookings /
                              analytics.overview.totalBookings) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </Badge>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {analytics.overview.pendingBookings}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <Badge variant="secondary" className="mt-2">
                      {analytics.overview.totalBookings > 0
                        ? (
                            (analytics.overview.pendingBookings /
                              analytics.overview.totalBookings) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </Badge>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {analytics.overview.cancelledBookings}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cancelled
                    </div>
                    <Badge variant="destructive" className="mt-2">
                      {analytics.overview.totalBookings > 0
                        ? (
                            (analytics.overview.cancelledBookings /
                              analytics.overview.totalBookings) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
