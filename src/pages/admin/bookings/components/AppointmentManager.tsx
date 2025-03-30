import React, { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, parseISO } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCart } from "@/components/cart/CartContext";
import { formatPrice } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckoutSection } from "./CheckoutSection";
import { SummaryView } from "./SummaryView";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/pages/admin/bookings/components/StatusBadge";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { AppointmentStatus } from "@/types/appointment";

const appointmentFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  time: z.string({
    required_error: "A time is required.",
  }),
  notes: z.string().optional(),
});

interface AppointmentFormValues {
  date: Date;
  time: string;
  notes?: string;
}

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  employees: any[];
  existingAppointment?: any | null;
  locationId: string;
  onAppointmentSaved?: () => void;
}

interface BookingItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'package';
  employee?: {
    id: string;
    name: string;
  };
  duration?: number;
}

// This is the AppointmentManager component
export const AppointmentManager = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId,
  onAppointmentSaved,
}: AppointmentManagerProps) => {
  const [step, setStep] = useState<'form' | 'checkout'>('form');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSummaryView, setShowSummaryView] = useState(false);
  const [couponCode, setCouponCode] = useState<string>("");
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [isTaxable, setIsTaxable] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [status, setStatus] = useState<AppointmentStatus>(existingAppointment?.status || 'booked');
  const [items, setItems] = useState<BookingItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>(existingAppointment?.employee_id || '');
  const [customerId, setCustomerId] = useState<string>(existingAppointment?.customer_id || '');
  const [notes, setNotes] = useState<string>(existingAppointment?.notes || '');

  const router = useRouter();
  const { clearCart, cartItems, getCartTotal } = useCart();
  const { updateAppointmentStatus, markAppointmentAs } = useAppointmentActions();
  
  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: selectedDate,
      time: selectedTime,
      notes: existingAppointment?.notes || '',
    },
  });

  useEffect(() => {
    setValue("date", selectedDate);
    setValue("time", selectedTime);
  }, [selectedDate, selectedTime, setValue]);

  useEffect(() => {
    if (existingAppointment) {
      setItems(existingAppointment.bookings.map((booking: any) => {
        const service = booking.service;
        const packageItem = booking.package;
        const employee = booking.employee;

        return {
          id: booking.id,
          name: service?.name || packageItem?.name || "Service",
          price: booking.price_paid || 0,
          type: service ? 'service' : 'package',
          employee: employee ? { id: employee.id, name: employee.name } : undefined,
          duration: service?.duration || packageItem?.duration || 0,
        };
      }));
      setCustomerId(existingAppointment.customer_id);
      setNotes(existingAppointment.notes || '');
      setStatus(existingAppointment.status);
    }
  }, [existingAppointment]);

  const formatDate = (date: Date): string => {
    return format(date, "EEE, dd MMM yyyy");
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return format(date, "h:mm a");
  };

  const onSubmit = (data: AppointmentFormValues) => {
    toast.success("Appointment details saved.");
    setStep('checkout');
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!existingAppointment?.id) return;
    
    setStatus(newStatus);
    await updateAppointmentStatus(existingAppointment.id, newStatus);
    
    if (newStatus === 'completed') {
      setStep('checkout');
      setShowSummaryView(true);
    }
  };

  const handleSaveAppointment = async () => {
    setSavingAppointment(true);
    try {
      const appointmentData = {
        customer_id: customerId,
        start_time: format(selectedDate, "yyyy-MM-dd") + " " + selectedTime + ":00",
        end_time: format(selectedDate, "yyyy-MM-dd") + " " + selectedTime + ":00",
        total_price: getCartTotal(),
        location_id: locationId,
        notes: notes,
        status: status,
        payment_method: paymentMethod,
        discount_type: couponCode ? 'coupon' : null,
        discount_value: couponDiscount || 0,
        tax_amount: taxAmount || 0,
        tax_id: isTaxable ? 'default_tax_id' : null,
      };

      if (existingAppointment) {
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', existingAppointment.id)
          .select()
          .single();

        if (error) throw error;

        await Promise.all(items.map(async (item) => {
          const bookingData = {
            appointment_id: existingAppointment.id,
            service_id: item.type === 'service' ? item.id : null,
            package_id: item.type === 'package' ? item.id : null,
            employee_id: item.employee?.id || null,
            start_time: format(selectedDate, "yyyy-MM-dd") + " " + selectedTime + ":00",
            end_time: format(selectedDate, "yyyy-MM-dd") + " " + selectedTime + ":00",
            price_paid: item.price,
          };

          const { data: bookingDataResult, error: bookingDataError } = await supabase
            .from('bookings')
            .update(bookingData)
            .eq('id', item.id)
            .select()
            .single();

          if (bookingDataError) throw bookingDataError;
        }));

        toast.success("Appointment updated successfully!");
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (error) throw error;

        await Promise.all(cartItems.map(async (item) => {
          const bookingData = {
            appointment_id: data.id,
            service_id: item.service_id || null,
            package_id: item.package_id || null,
            employee_id: selectedEmployee || null,
            start_time: format(selectedDate, "yyyy-MM-dd") + " " + selectedTime + ":00",
            end_time: format(selectedDate, "yyyy-MM-dd") + " " + selectedTime + ":00",
            price_paid: item.price,
          };

          const { data: bookingDataResult, error: bookingDataError } = await supabase
            .from('bookings')
            .insert(bookingData)
            .select()
            .single();

          if (bookingDataError) throw bookingDataError;
        }));

        toast.success("Appointment created successfully!");
        await clearCart();
      }

      onClose();
      if (onAppointmentSaved) {
        onAppointmentSaved();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleDeleteAppointment = async () => {
    try {
      if (!existingAppointment) {
        toast.error("No appointment to delete.");
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', existingAppointment.id);

      if (error) {
        throw error;
      }

      toast.success("Appointment deleted successfully!");
      onClose();
      if (onAppointmentSaved) {
        onAppointmentSaved();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const statusOptions = [
    { value: 'booked', label: 'Booked' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'inprogress', label: 'In Progress' },
    { value: 'noshow', label: 'No Show' },
    { value: 'canceled', label: 'Canceled' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold">
              {existingAppointment ? "Edit Appointment" : "New Appointment"}
            </h2>
            <div className="text-muted-foreground">
              ({formatDate(selectedDate)}{" "}
              {selectedTime ? `at ${formatTime(selectedTime)}` : ""})
            </div>
          </div>
          
          {existingAppointment && (
            <div className="flex items-center space-x-4">
              {status !== 'completed' && status !== 'refunded' && status !== 'partially_refunded' && status !== 'voided' && (
                <div className="flex space-x-2">
                  <StatusBadge status={status} />
                  {statusOptions.some(option => option.value === status) && (
                    <Select value={status} onValueChange={(value) => {
                      const newStatus = value as AppointmentStatus;
                      
                      if (newStatus === 'noshow' || newStatus === 'canceled') {
                      } else {
                        handleStatusChange(newStatus);
                      }
                    }}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => {
                          if (option.value === 'noshow' || option.value === 'canceled') {
                            return (
                              <AlertDialog key={option.value}>
                                <AlertDialogTrigger asChild>
                                  <SelectItem value={option.value}>{option.label}</SelectItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{option.label} Confirmation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to mark this appointment as {option.label.toLowerCase()}? 
                                      {option.value === 'canceled' && " This will cancel the appointment."}
                                      {option.value === 'noshow' && " This indicates the customer didn't show up."}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleStatusChange(option.value as AppointmentStatus)}>
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            );
                          } else {
                            return <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>;
                          }
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              
              <Button
                variant="outline"
                type="button"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="flex-grow flex">
          <div className="p-6 w-full max-w-[600px]">
            {step === 'form' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? formatDate(selectedDate) : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setValue("date", date || new Date());
                        }}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date?.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    defaultValue={selectedTime}
                    className="w-full"
                    onChange={(e) => setValue("time", e.target.value)}
                  />
                  {errors.time && (
                    <p className="text-sm text-red-500">{errors.time?.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Appointment notes..."
                    className="w-full"
                    defaultValue={notes}
                    onChange={(e) => {
                      setValue("notes", e.target.value);
                      setNotes(e.target.value);
                    }}
                  />
                </div>

                <Button type="submit">Next</Button>
              </form>
            )}

            {step === 'checkout' && !showSummaryView && (
              <div className="flex items-center justify-center h-full">
                <Button onClick={() => setShowSummaryView(true)}>
                  Show Summary
                </Button>
              </div>
            )}
          </div>

          {step === 'checkout' && (
            <CheckoutSection
              items={items}
              setItems={setItems}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              customerId={customerId}
              employeeId={selectedEmployee}
              locationId={locationId}
              notes={notes}
              setNotes={setNotes}
              employee={employees.find((emp: any) => emp.id === selectedEmployee)}
              startTime={selectedTime}
              setCouponDiscount={setCouponDiscount}
              setTaxAmount={setTaxAmount}
              selectedEmployee={selectedEmployee}
              selectedDate={selectedDate}
              existingAppointmentId={existingAppointment?.id}
              appointmentStatus={status}
              selectedTime={selectedTime}
              status={status}
              onStatusChange={setStatus}
              isTaxable={isTaxable}
              setIsTaxable={setIsTaxable}
              onSaveAppointment={handleSaveAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              showSummaryView={showSummaryView}
              savingAppointment={savingAppointment}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
