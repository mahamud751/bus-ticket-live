"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  MapPin,
  BarChart3,
  ArrowLeft,
  Clock,
  Activity,
} from "lucide-react";
import { toast } from "react-hot-toast";

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
  dailyTrends: Array<{
    date: string;
    bookings: number;
    revenue: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
    period: string;
  };
}

export default function AdminAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("week");

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

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-8">
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

  const renderAnalyticsContent = () => {
    if (!analytics) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <BarChart3 className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Analytics Data Available
          </h3>
          <p className="text-gray-600 mb-6">
            Unable to load analytics data. Please try refreshing the page.
          </p>
          <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
            Retry Loading
          </Button>
        </div>
      );
    }

    if (analytics.overview.totalBookings === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <BarChart3 className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Booking Data Found
          </h3>
          <p className="text-gray-600 mb-6">
            There are no bookings in the selected time period ({period}). 
            Try selecting a different time period or ensure there is booking data in the system.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => setPeriod('month')} 
              variant="outline"
              className={period === 'month' ? 'bg-blue-50 border-blue-300' : ''}
            >
              View This Month
            </Button>
            <Button 
              onClick={() => setPeriod('year')} 
              variant="outline"
              className={period === 'year' ? 'bg-blue-50 border-blue-300' : ''}
            >
              View This Year
            </Button>
            <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
              Refresh Data
            </Button>
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> To see analytics data, you need to have bookings in your system. 
              You can create test schedules and bookings through the admin dashboard.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Bookings
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.overview.totalBookings}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.overview.confirmedBookings} confirmed
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(analytics.overview.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    From confirmed bookings
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Conversion Rate
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.overview.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Booking success rate
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Bookings
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.overview.pendingBookings}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Awaiting confirmation
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Period: {analytics.period.period.charAt(0).toUpperCase() + analytics.period.period.slice(1)}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(analytics.period.startDate).toLocaleDateString()} - {new Date(analytics.period.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Routes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Routes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topRoutes.slice(0, 8).map((route, index) => (
                  <div
                    key={route.scheduleId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        {route.route ? (
                          <>
                            <div className="font-medium">
                              {route.route.origin} → {route.route.destination}
                            </div>
                            <div className="text-sm text-gray-600">
                              {route.route.operator}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium text-gray-500">
                            Unknown Route
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {route.bookings} bookings
                      </div>
                      <div className="text-sm text-gray-600">
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
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Operator Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.operatorStats.slice(0, 8).map((operator, index) => (
                  <div
                    key={operator.operatorId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {operator.operatorName}
                        </div>
                        <div className="text-sm text-gray-600">
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

        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Booking Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.dailyTrends.map((day, ) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg"
                >
                  <div>
                    <div className="font-medium">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {day.bookings} bookings
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600">
                  {analytics.overview.confirmedBookings}
                </div>
                <div className="text-sm text-gray-600 mt-1">Confirmed</div>
                <Badge variant="default" className="mt-2">
                  {analytics.overview.totalBookings > 0
                    ? ((analytics.overview.confirmedBookings / analytics.overview.totalBookings) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>

              <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-3xl font-bold text-orange-600">
                  {analytics.overview.pendingBookings}
                </div>
                <div className="text-sm text-gray-600 mt-1">Pending</div>
                <Badge variant="secondary" className="mt-2">
                  {analytics.overview.totalBookings > 0
                    ? ((analytics.overview.pendingBookings / analytics.overview.totalBookings) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>

              <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                <div className="text-3xl font-bold text-red-600">
                  {analytics.overview.cancelledBookings}
                </div>
                <div className="text-sm text-gray-600 mt-1">Cancelled</div>
                <Badge variant="destructive" className="mt-2">
                  {analytics.overview.totalBookings > 0
                    ? ((analytics.overview.cancelledBookings / analytics.overview.totalBookings) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Analytics & Reports
                </h1>
                <p className="text-sm text-gray-600">
                  Comprehensive booking analytics and performance metrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderAnalyticsContent()}
      </div>
    </div>
  );
}