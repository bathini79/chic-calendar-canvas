
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Appointment, Booking } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SummaryViewProps {
  appointmentId: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ appointmentId }) => {
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [editSaleDialogOpen, setEditSaleDialogOpen] = useState(false);
  const { updateBookingStylelist } = useAppointmentActions();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      setIsLoading(true);
      try {
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq("id", appointmentId)
          .single();

        if (appointmentError) throw appointmentError;
        setAppointment(appointmentData);

        const { data: employeesData, error: employeesError } = await supabase
          .from("employees")
          .select("*")
          .eq("status", "active");

        if (employeesError) throw employeesError;
        setEmployees(employeesData);
      } catch (error) {
        console.error("Error fetching appointment details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId]);

  const handleRebook = () => {
    if (!appointment) return;

    // Navigate to create a new appointment based on this one
    navigate(`/admin/bookings`, {
      state: {
        rebookFrom: appointmentId,
        customer: appointment.customer,
        services: appointment.bookings
          .filter((booking: any) => booking.service)
          .map((booking: any) => ({
            id: booking.service.id,
            name: booking.service.name,
            price: booking.service.selling_price,
            type: 'service',
            employee: booking.employee ? {
              id: booking.employee.id,
              name: booking.employee.name
            } : undefined,
            duration: booking.service.duration
          })),
        packages: appointment.bookings
          .filter((booking: any) => booking.package)
          .map((booking: any) => ({
            id: booking.package.id,
            name: booking.package.name,
            price: booking.package.price,
            type: 'package',
            employee: booking.employee ? {
              id: booking.employee.id,
              name: booking.employee.name
            } : undefined,
            duration: booking.package.duration
          }))
      }
    });
  };

  const handleEditSale = () => {
    setEditSaleDialogOpen(true);
  };

  const handleEmployeeChange = async (bookingId: string, employeeId: string) => {
    try {
      await updateBookingStylelist(bookingId, employeeId);
      
      // Update the local state to reflect changes
      setAppointment((prevAppointment: any) => ({
        ...prevAppointment,
        bookings: prevAppointment.bookings.map((booking: any) => {
          if (booking.id === bookingId) {
            const newEmployee = employees.find(e => e.id === employeeId);
            return {
              ...booking,
              employee_id: employeeId,
              employee: newEmployee
            };
          }
          return booking;
        })
      }));
      
      toast.success("Stylist updated successfully");
    } catch (error) {
      console.error("Error updating stylist:", error);
      toast.error("Failed to update stylist");
    }
    
    setSelectedBookingId(null);
    setSelectedEmployeeId("");
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Appointment not found</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">Appointment Summary</h3>
          <p className="text-muted-foreground">
            {formatDate(appointment.start_time)}
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleRebook}>
            Rebook
          </Button>
          <Button variant="outline" onClick={handleEditSale}>
            Edit Sale Details
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium mb-1">Customer</h4>
        <p className="mb-1">{appointment.customer?.full_name || "Guest"}</p>
        {appointment.customer?.email && (
          <p className="text-sm text-muted-foreground">
            {appointment.customer.email}
          </p>
        )}
        {appointment.customer?.phone && (
          <p className="text-sm text-muted-foreground">
            {appointment.customer.phone}
          </p>
        )}
      </div>

      <div>
        <h4 className="font-medium mb-3">Services</h4>
        <div className="space-y-4">
          {appointment.bookings.map((booking: any) => {
            const isService = !!booking.service;
            const isPackage = !!booking.package;
            const name = isService
              ? booking.service.name
              : isPackage
              ? booking.package.name
              : "Unknown";
            const price = booking.price_paid || 0;

            return (
              <div
                key={booking.id}
                className="flex justify-between items-start py-2 border-b"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.employee?.name || "Unassigned"}
                  </p>
                </div>
                <div className="text-right">
                  <p>{formatPrice(price)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(appointment.total_price)}</span>
        </div>

        {appointment.discount_value > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({appointment.discount_type === "percentage" ? `${appointment.discount_value}%` : "fixed"})</span>
            <span>-{formatPrice(getDiscountAmount(appointment))}</span>
          </div>
        )}

        {appointment.coupon_name && (
          <div className="flex justify-between text-green-600">
            <span>Coupon ({appointment.coupon_name})</span>
            <span>-{formatPrice(appointment.coupon_amount || 0)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Total</span>
          <span>{formatPrice(appointment.total_price)}</span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md space-y-2">
        <div className="flex justify-between">
          <span>Payment Method</span>
          <span className="capitalize">{appointment.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span className="capitalize">{appointment.status}</span>
        </div>
        {appointment.refunded_by && (
          <div className="flex justify-between text-red-600">
            <span>Refunded By</span>
            <span>{appointment.refunded_by}</span>
          </div>
        )}
        {appointment.refund_reason && (
          <div className="flex justify-between text-red-600">
            <span>Refund Reason</span>
            <span>{appointment.refund_reason}</span>
          </div>
        )}
      </div>

      {appointment.notes && (
        <div>
          <h4 className="font-medium mb-1">Notes</h4>
          <p className="text-muted-foreground">{appointment.notes}</p>
        </div>
      )}

      {/* Edit Sale Dialog */}
      <Dialog open={editSaleDialogOpen} onOpenChange={setEditSaleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sale Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <h4 className="font-medium">Assign Stylists</h4>
            {appointment.bookings.map((booking: any) => {
              const isService = !!booking.service;
              const isPackage = !!booking.package;
              const name = isService
                ? booking.service.name
                : isPackage
                ? booking.package.name
                : "Unknown";
              
              return (
                <div key={booking.id} className="flex flex-col space-y-1">
                  <label className="text-sm font-medium">{name}</label>
                  <Select 
                    defaultValue={booking.employee_id || ''} 
                    onValueChange={(value) => handleEmployeeChange(booking.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stylist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setEditSaleDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function getDiscountAmount(appointment: any) {
    const total = appointment.total_price;
    if (appointment.discount_type === "percentage") {
      return total * (appointment.discount_value / 100);
    }
    return appointment.discount_value || 0;
  }
};
