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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Appointment,
  AppointmentStatus,
  RefundData,
  TransactionDetails,
} from "../types";
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  MinusCircle,
  PlusCircle,
  Settings2,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppointmentDetails } from "@/hooks/use-appointment-details";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { InputCurrency } from "@/components/ui/input-currency";
import { supabase } from "@/integrations/supabase/client";
import { useAppointmentNotifications, NOTIFICATION_TYPES } from "@/hooks/use-appointment-notifications";

interface AppointmentDetailsDialogProps {
  appointmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailsDialog({
  appointmentId,
  open,
  onOpenChange,
}: AppointmentDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"details" | "actions" | "notifications">("details");
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundNotes, setRefundNotes] = useState<string>("");
  const [refundedBy, setRefundedBy] = useState<string>("");
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isMarkingAsNoShow, setIsMarkingAsNoShow] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<DateRange | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>("09:00");
  const [isEditingStylist, setIsEditingStylist] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState<string>("");
  const [selectedBookingIdForStylist, setSelectedBookingIdForStylist] = useState<string>("");
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isRefundNotesExpanded, setIsRefundNotesExpanded] = useState(false);
  const { toast } = useToast();

  const {
    data: appointment,
    isLoading: isAppointmentLoading,
    error: appointmentError,
    isNoShow,
    isPending,
    isCanceled,
    isConfirmed,
    isCompleted,
    isRefunded,
    canCancel,
    canNoShow,
    canComplete,
    canRefund,
  } = useAppointmentDetails(appointmentId);

  const {
    isLoading,
    selectedItems,
    fetchAppointmentDetails,
    updateAppointmentStatus,
    processRefund,
    updateBookingStylelist,
    cancelAppointment,
    markAppointmentAs
  } = useAppointmentActions();
  
  const {  isLoading: isSendingNotification } = useAppointmentNotifications();
  
  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails(appointmentId);
    }
  }, [appointmentId, fetchAppointmentDetails]);

  const handleRefund = async () => {
    if (!appointmentId) return;

    const refundData: RefundData = {
      reason: refundReason,
      notes: refundNotes,
      refundedBy: refundedBy,
    };

    const success = await processRefund(appointmentId, selectedBookingIds, refundData);
    if (success) {
      setIsRefunding(false);
    }
  };

  const handleCancel = async () => {
    if (!appointmentId) return;
    const success = await cancelAppointment(appointmentId, selectedBookingIds);
    if (success) {
      setIsCanceling(false);
    }
  };

  const handleMarkAsNoShow = async () => {
    if (!appointmentId) return;
    const success = await markAppointmentAs(appointmentId, 'noshow');
    if (success) {
      setIsMarkingAsNoShow(false);
    }
  };

  const handleComplete = async () => {
    if (!appointmentId) return;
    const success = await markAppointmentAs(appointmentId, 'completed');
    if (success) {
      setIsCompleting(false);
    }
  };

  const handleReschedule = () => {
    setIsRescheduling(false);
    toast({
      title: "Reschedule",
      description: "Reschedule feature is not implemented yet.",
    });
  };

  const handleEditStylist = async () => {
    if (!selectedBookingIdForStylist || !selectedStylist) return;
    try {
      await updateBookingStylelist(selectedBookingIdForStylist, selectedStylist);
      setIsEditingStylist(false);
      toast({
        title: "Success",
        description: "Stylist updated successfully.",
      });
      fetchAppointmentDetails(appointmentId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update stylist.",
        variant: "destructive",
      });
    }
  };

  const tabs = [
    {
      id: "details",
      label: "Details",
      icon: FileText
    },
    {
      id: "actions",
      label: "Actions",
      icon: Settings2
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: MessageSquare
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <CalendarClock className="mr-2 h-4 w-4" /> View Details
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-3xl">
        <SheetHeader className="space-y-2.5">
          <SheetTitle>Appointment Details</SheetTitle>
          <SheetDescription>
            View all the details of this appointment. You can also perform
            actions to manage this appointment.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <div className="flex items-center space-x-4 pb-4">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={cn(
                  "gap-2",
                  activeTab === tab.id && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
          <Separator />
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          {isAppointmentLoading ? (
            <div className="grid gap-4 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : appointmentError ? (
            <div className="p-4">
              <p className="text-red-500">Error: {appointmentError.message}</p>
            </div>
          ) : (
            <>
              {activeTab === "details" && (
                <div className="space-y-4 p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Appointment Information</CardTitle>
                      <CardDescription>
                        Details about the appointment.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Customer</Label>
                          <div className="flex items-center space-x-2">
                            <Avatar>
                              <AvatarImage src={appointment?.customer?.avatar_url} />
                              <AvatarFallback>
                                {appointment?.customer?.full_name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{appointment?.customer?.full_name}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Date and Time</Label>
                          <span>
                            {format(
                              new Date(appointment?.start_time),
                              "MMMM dd, yyyy - hh:mm a"
                            )}
                          </span>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <span>{appointment?.status}</span>
                        </div>
                        <div>
                          <Label>Location</Label>
                          <span>{appointment?.location_name || 'N/A'}</span>
                        </div>
                        <div>
                          <Label>Payment Method</Label>
                          <span>{appointment?.payment_method}</span>
                        </div>
                        <div>
                          <Label>Total Price</Label>
                          <span>${appointment?.total_price}</span>
                        </div>
                        <div>
                          <Label>Discount Type</Label>
                          <span>{appointment?.discount_type}</span>
                        </div>
                        <div>
                          <Label>Discount Value</Label>
                          <span>{appointment?.discount_value}</span>
                        </div>
                        <div>
                          <Label>Tax Amount</Label>
                          <span>${appointment?.tax_amount}</span>
                        </div>
                        <div>
                          <Label>Coupon Name</Label>
                          <span>{appointment?.coupon_name || 'N/A'}</span>
                        </div>
                        <div>
                          <Label>Coupon Amount</Label>
                          <span>{appointment?.coupon_amount || 'N/A'}</span>
                        </div>
                        <div>
                          <Label>Membership Name</Label>
                          <span>{appointment?.membership_name || 'N/A'}</span>
                        </div>
                        <div>
                          <Label>Membership Discount</Label>
                          <span>{appointment?.membership_discount || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={appointment?.notes}
                          readOnly
                          className="resize-none"
                          rows={isNotesExpanded ? 5 : 3}
                          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Bookings</CardTitle>
                      <CardDescription>
                        List of services and packages booked for this appointment.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service/Package</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointment?.bookings?.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                {booking.service?.name || booking.package?.name}
                              </TableCell>
                              <TableCell>
                                {booking.employee?.full_name || "Any"}
                              </TableCell>
                              <TableCell className="text-right">
                                ${booking.price_paid}
                              </TableCell>
                              <TableCell>{booking.status}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setIsEditingStylist(true);
                                    setSelectedBookingIdForStylist(booking.id);
                                  }}
                                >
                                  Edit Stylist
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "actions" && (
                <div className="space-y-4 p-4">
                  <h3 className="text-lg font-medium">Actions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Perform actions to manage this appointment.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {canCancel && (
                      <Button
                        variant="destructive"
                        onClick={() => setIsCanceling(true)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Cancel Appointment
                      </Button>
                    )}

                    {canNoShow && (
                      <Button
                        variant="destructive"
                        onClick={() => setIsMarkingAsNoShow(true)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MinusCircle className="mr-2 h-4 w-4" />
                        )}
                        Mark as No-Show
                      </Button>
                    )}

                    {canComplete && (
                      <Button
                        variant="outline"
                        onClick={() => setIsCompleting(true)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Mark as Completed
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => setIsRescheduling(true)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarClock className="mr-2 h-4 w-4" />
                      )}
                      Reschedule
                    </Button>

                    {canRefund && (
                      <Button
                        variant="destructive"
                        onClick={() => setIsRefunding(true)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Badge variant="destructive" className="mr-2">
                            <MinusCircle className="mr-2 h-4 w-4" />
                            Refund
                          </Badge>
                        )}
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </ScrollArea>

        {/* Refund Dialog */}
        <AlertDialog open={isRefunding} onOpenChange={setIsRefunding}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund Appointment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to refund this appointment? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="refund-reason">Refund Reason</Label>
                  <Input
                    id="refund-reason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="refunded-by">Refunded By</Label>
                  <Input
                    id="refunded-by"
                    value={refundedBy}
                    onChange={(e) => setRefundedBy(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="refund-notes">Refund Notes</Label>
                <Textarea
                  id="refund-notes"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="mt-2 resize-none"
                  rows={isRefundNotesExpanded ? 5 : 3}
                  onClick={() => setIsRefundNotesExpanded(!isRefundNotesExpanded)}
                />
              </div>
              <div>
                <Label>Select Bookings to Refund</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {appointment?.bookings?.map((booking) => (
                    <div key={booking.id} className="flex items-center space-x-2">
                      <Switch
                        id={`booking-${booking.id}`}
                        checked={selectedBookingIds.includes(booking.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBookingIds((prev) => [...prev, booking.id]);
                          } else {
                            setSelectedBookingIds((prev) =>
                              prev.filter((id) => id !== booking.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`booking-${booking.id}`}>
                        {booking.service?.name || booking.package?.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRefund} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Dialog */}
        <AlertDialog open={isCanceling} onOpenChange={setIsCanceling}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this appointment? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Select Bookings to Cancel</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {appointment?.bookings?.map((booking) => (
                    <div key={booking.id} className="flex items-center space-x-2">
                      <Switch
                        id={`booking-${booking.id}`}
                        checked={selectedBookingIds.includes(booking.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBookingIds((prev) => [...prev, booking.id]);
                          } else {
                            setSelectedBookingIds((prev) =>
                              prev.filter((id) => id !== booking.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`booking-${booking.id}`}>
                        {booking.service?.name || booking.package?.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mark as No-Show Dialog */}
        <AlertDialog
          open={isMarkingAsNoShow}
          onOpenChange={setIsMarkingAsNoShow}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as No-Show</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark this appointment as a no-show?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsNoShow} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Mark as No-Show
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mark as Completed Dialog */}
        <AlertDialog open={isCompleting} onOpenChange={setIsCompleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Completed</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark this appointment as completed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Mark as Completed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reschedule Dialog */}
        <AlertDialog open={isRescheduling} onOpenChange={setIsRescheduling}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reschedule Appointment</AlertDialogTitle>
              <AlertDialogDescription>
                Select a new date and time for this appointment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>New Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !rescheduleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      {rescheduleDate?.from ? (
                        rescheduleDate.to ? (
                          `${format(rescheduleDate.from, "LLL dd, y")} - ${format(
                            rescheduleDate.to,
                            "LLL dd, y"
                          )}`
                        ) : (
                          format(rescheduleDate.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="range"
                      defaultMonth={rescheduleDate?.from}
                      selected={rescheduleDate}
                      onSelect={setRescheduleDate}
                      disabled={{ before: addDays(new Date(), 0) }}
                      numberOfMonths={2}
                      pagedNavigation
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReschedule} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reschedule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Stylist Dialog */}
        <AlertDialog open={isEditingStylist} onOpenChange={setIsEditingStylist}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Stylist</AlertDialogTitle>
              <AlertDialogDescription>
                Select a new stylist for this booking.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>New Stylist</Label>
                <Select onValueChange={setSelectedStylist}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a stylist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {/* TODO: Fetch employees from database */}
                    <SelectItem value="employee-1">Employee 1</SelectItem>
                    <SelectItem value="employee-2">Employee 2</SelectItem>
                    <SelectItem value="employee-3">Employee 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEditStylist} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Edit Stylist
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
