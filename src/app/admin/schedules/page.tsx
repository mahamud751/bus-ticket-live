"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Bus,
  Calendar,
  DollarSign,
  Edit,
  MapPin,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";

interface Route {
  id: string;
  operator: {
    id: string;
    name: string;
  };
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
}

interface Bus {
  id: string;
  operatorId: string;
  busNumber: string;
  busType: string;
  totalSeats: number;
  operator: {
    id: string;
    name: string;
  };
}

interface ScheduleForm {
  routeId: string;
  busId: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  isActive: boolean;
}

interface Schedule {
  id: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  isActive: boolean;
  route: {
    id: string;
    origin: {
      name: string;
      code: string;
    };
    destination: {
      name: string;
      code: string;
    };
  };
  bus: {
    id: string;
    busNumber: string;
    busType: string;
  };
  operator: {
    id: string;
    name: string;
  };
  pricingTiers: Array<{
    seatType: string;
    price: number;
  }>;
  bookings: Array<{
    id: string;
    status: string;
  }>;
}

export default function AdminSchedules() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSchedules, setTotalSchedules] = useState(0);
  const [totalActiveSchedules, setTotalActiveSchedules] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    routeId: '',
    busId: '',
    departureTime: '',
    arrivalTime: '',
    basePrice: 0,
    isActive: true,
  });

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/schedules?page=${page}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setSchedules(data.data.schedules);
        setTotalPages(data.data.pagination.pages);
        setTotalSchedules(data.data.pagination.total);
        setTotalActiveSchedules(data.data.statistics.totalActive);
        setTotalBookings(data.data.statistics.totalBookings);
        setAveragePrice(data.data.statistics.averagePrice);
      } else {
        toast.error(data.error || "Failed to fetch schedules");
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to fetch schedules");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  const fetchRoutes = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/routes');
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  }, []);

  const fetchBuses = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/buses');
      const data = await response.json();
      if (data.success) {
        setBuses(data.data);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  }, []);

  const handleCreateSchedule = async () => {
    if (!scheduleForm.routeId || !scheduleForm.busId || !scheduleForm.departureTime || !scheduleForm.arrivalTime || !scheduleForm.basePrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleForm),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Schedule created successfully!');
        setShowAddDialog(false);
        setScheduleForm({
          routeId: '',
          busId: '',
          departureTime: '',
          arrivalTime: '',
          basePrice: 0,
          isActive: true,
        });
        fetchSchedules();
      } else {
        toast.error(data.error || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!editingSchedule) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/schedules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingSchedule.id,
          ...scheduleForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Schedule updated successfully!');
        setShowEditDialog(false);
        setEditingSchedule(null);
        setScheduleForm({
          routeId: '',
          busId: '',
          departureTime: '',
          arrivalTime: '',
          basePrice: 0,
          isActive: true,
        });
        fetchSchedules();
      } else {
        toast.error(data.error || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm(`Are you sure you want to delete this schedule? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/schedules', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: schedule.id }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Schedule deleted successfully!');
        fetchSchedules();
      } else {
        toast.error(data.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      routeId: schedule.route.id,
      busId: schedule.bus.id,
      departureTime: new Date(schedule.departureTime).toISOString().slice(0, 16),
      arrivalTime: new Date(schedule.arrivalTime).toISOString().slice(0, 16),
      basePrice: schedule.basePrice,
      isActive: schedule.isActive,
    });
    setShowEditDialog(true);
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth/signin");
      return;
    }

    fetchSchedules();
    fetchRoutes();
    fetchBuses();
  }, [session, status, router, fetchSchedules, fetchRoutes, fetchBuses]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
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

  const getBookingStats = (bookings: Array<{ status: string }>) => {
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const pending = bookings.filter((b) => b.status === "PENDING").length;
    const total = bookings.length;

    return { confirmed, pending, total };
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading schedules...</span>
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
                  Manage Schedules
                </h1>
                <p className="text-sm text-gray-600">
                  Create and manage bus schedules and pricing
                </p>
              </div>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Schedule</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="route">Route</Label>
                      <select
                        id="route"
                        value={scheduleForm.routeId}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, routeId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Route</option>
                        {routes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.origin.name} → {route.destination.name} ({route.operator.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="bus">Bus</Label>
                      <select
                        id="bus"
                        value={scheduleForm.busId}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, busId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Bus</option>
                        {buses.map((bus) => (
                          <option key={bus.id} value={bus.id}>
                            {bus.busNumber} - {bus.busType} ({bus.operator.name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="departureTime">Departure Time</Label>
                      <Input
                        id="departureTime"
                        type="datetime-local"
                        value={scheduleForm.departureTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, departureTime: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="arrivalTime">Arrival Time</Label>
                      <Input
                        id="arrivalTime"
                        type="datetime-local"
                        value={scheduleForm.arrivalTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, arrivalTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="basePrice">Base Price (৳)</Label>
                      <Input
                        id="basePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={scheduleForm.basePrice || ''}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, basePrice: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        id="isActive"
                        type="checkbox"
                        checked={scheduleForm.isActive}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, isActive: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="isActive">Active Schedule</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setScheduleForm({
                        routeId: '',
                        busId: '',
                        departureTime: '',
                        arrivalTime: '',
                        basePrice: 0,
                        isActive: true,
                      });
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSchedule}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Schedule'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Schedules
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalSchedules}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Schedules
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalActiveSchedules}
                  </p>
                </div>
                <Bus className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Bookings
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalBookings}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Price
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ৳
                    {averagePrice.toFixed(0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Bus</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => {
                    const departure = formatDateTime(schedule.departureTime);
                    const bookingStats = getBookingStats(schedule.bookings);

                    return (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {schedule.route.origin.name} →{" "}
                              {schedule.route.destination.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {schedule.route.origin.code} →{" "}
                              {schedule.route.destination.code}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">
                            {schedule.operator.name}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {schedule.bus.busNumber}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {schedule.bus.busType}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{departure.time}</div>
                            <div className="text-sm text-gray-600">
                              {departure.date}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">
                            ৳{schedule.basePrice}
                          </div>
                          {schedule.pricingTiers.length > 1 && (
                            <div className="text-sm text-gray-600">
                              Premium: ৳
                              {schedule.pricingTiers.find(
                                (t) => t.seatType === "PREMIUM"
                              )?.price || schedule.basePrice}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {bookingStats.total}
                            </div>
                            <div className="text-sm text-gray-600">
                              {bookingStats.confirmed} confirmed,{" "}
                              {bookingStats.pending} pending
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              schedule.isActive ? "default" : "secondary"
                            }
                          >
                            {schedule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editRoute">Route</Label>
                <select
                  id="editRoute"
                  value={scheduleForm.routeId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, routeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.origin.name} → {route.destination.name} ({route.operator.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="editBus">Bus</Label>
                <select
                  id="editBus"
                  value={scheduleForm.busId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, busId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.busNumber} - {bus.busType} ({bus.operator.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editDepartureTime">Departure Time</Label>
                <Input
                  id="editDepartureTime"
                  type="datetime-local"
                  value={scheduleForm.departureTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, departureTime: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="editArrivalTime">Arrival Time</Label>
                <Input
                  id="editArrivalTime"
                  type="datetime-local"
                  value={scheduleForm.arrivalTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, arrivalTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editBasePrice">Base Price (৳)</Label>
                <Input
                  id="editBasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={scheduleForm.basePrice || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, basePrice: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  id="editIsActive"
                  type="checkbox"
                  checked={scheduleForm.isActive}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="editIsActive">Active Schedule</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingSchedule(null);
                setScheduleForm({
                  routeId: '',
                  busId: '',
                  departureTime: '',
                  arrivalTime: '',
                  basePrice: 0,
                  isActive: true,
                });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSchedule}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
