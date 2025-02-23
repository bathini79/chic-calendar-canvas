
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  ClipboardList, 
  CreditCard, 
  Banknote,
  MoreVertical,
  PencilLine,
  FileText,
  Mail,
  Printer,
  Download,
  Ban
} from "lucide-react";
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppointmentActions } from '../hooks/useAppointmentActions';
import type { Appointment, RefundData, RefundItem } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SummaryViewProps {
  appointmentId: string;
  selectedItems: Array<{
    id: string;
    name: string;
    price: number;
    type: 'service' | 'package';
    employee?: {
      id: string;
      name: string;
    };
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'online';
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  completedAt: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  selectedItems,
  subtotal,
  discountAmount,
  total,
  paymentMethod,
  discountType,
  discountValue,
  completedAt,
}) => {
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [note, setNote] = useState('');
  const [refundItems, setRefundItems] = useState<{[key: string]: boolean}>({});
  const [appointmentDetails, setAppointmentDetails] = useState<Appointment | null>(null);
  const [refundReason, setRefundReason] = useState<RefundData['reason']>('customer_dissatisfaction');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundedBy, setRefundedBy] = useState('');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { fetchAppointmentDetails } = useAppointmentActions();

  useEffect(() => {
    loadAppointmentDetails();
    fetchEmployees();
  }, [appointmentId]);

  useEffect(() => {
    if (selectAll && appointmentDetails) {
      const allItems = {} as {[key: string]: boolean};
      appointmentDetails.bookings.forEach(booking => {
        // Only allow selecting items that haven't been refunded yet
        if (booking.status !== 'refunded') {
          if (booking.service_id) allItems[booking.service_id] = true;
          if (booking.package_id) allItems[booking.package_id] = true;
        }
      });
      setRefundItems(allItems);
    }
  }, [selectAll, appointmentDetails]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('status', 'active');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const loadAppointmentDetails = async () => {
    const details = await fetchAppointmentDetails(appointmentId);
    if (details) {
      setAppointmentDetails(details);
    }
  };

  const getRefundableItems = (): RefundItem[] => {
    if (!appointmentDetails) return [];

    return appointmentDetails.bookings
      .filter(booking => booking.status !== 'refunded') // Only show non-refunded items
      .map(booking => ({
        id: booking.service_id || booking.package_id || '',
        booking_id: booking.id,
        price: booking.price_paid,
        type: booking.service_id ? 'service' : 'package',
        name: booking.service?.name || booking.package?.name || '',
        employee: booking.employee ? {
          id: booking.employee.id,
          name: booking.employee.name
        } : undefined
      }))
      .filter(item => item.id); // Filter out any items without an ID
  };

  const handleRefundSale = async () => {
    if (!appointmentDetails || !refundedBy) {
      toast.error("Please select who processed the refund");
      return;
    }

    try {
      const selectedItemIds = Object.entries(refundItems)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);

      if (selectedItemIds.length === 0) {
        toast.error("Please select at least one item to refund");
        return;
      }

      // Get all bookings that need to be refunded
      const bookingsToRefund = appointmentDetails.bookings.filter(booking => {
        const itemId = booking.service_id || booking.package_id;
        return itemId && selectedItemIds.includes(itemId);
      });

      // If refunding a package, include all its associated service bookings
      const packageBookings = bookingsToRefund.filter(b => b.package_id);
      const additionalServiceBookings = appointmentDetails.bookings.filter(
        booking => packageBookings.some(pb => 
          pb.package_id === booking.package_id && 
          !bookingsToRefund.some(b => b.id === booking.id)
        )
      );

      const allBookingsToRefund = [...bookingsToRefund, ...additionalServiceBookings];
      const bookingIds = allBookingsToRefund.map(b => b.id);

      // Calculate total refund amount
      const refundAmount = allBookingsToRefund.reduce((sum, booking) => sum + booking.price_paid, 0);

      // Update bookings with refund details
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({
          status: 'refunded',
          refund_reason: refundReason,
          refund_notes: refundNotes,
          refunded_by: refundedBy,
          refunded_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      // Check if all bookings are being refunded
      const remainingBookings = appointmentDetails.bookings.filter(
        booking => !bookingIds.includes(booking.id)
      );

      // Update appointment status if all items are refunded
      const newAppointmentStatus = remainingBookings.length === 0 ? 'refunded' : 'partial_refund';
      
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: newAppointmentStatus,
          refunded_by: refundedBy,
          refund_reason: refundReason,
          refund_notes: refundNotes
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      await loadAppointmentDetails();
      setShowRefundDialog(false);
      toast.success(`Refund of ₹${refundAmount.toFixed(2)} processed successfully`);
    } catch (error: any) {
      console.error("Error refunding sale:", error);
      toast.error("Failed to process refund");
    }
  };

  const handleVoidSale = async () => {
    if (!appointmentDetails) return;

    try {
      const bookingIds = appointmentDetails.bookings.map(booking => booking.id);
      
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ status: 'voided' })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'voided' })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      await loadAppointmentDetails();
      setShowVoidDialog(false);
      toast.success('Sale voided successfully');
    } catch (error: any) {
      console.error("Error voiding sale:", error);
      toast.error("Failed to void sale");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ notes: note })
        .eq('id', appointmentId);

      if (error) throw error;

      await loadAppointmentDetails();
      setShowAddNoteDialog(false);
      setNote('');
      toast.success('Note added successfully');
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    }
  };

  const refundableItems = getRefundableItems();

  return (
    <>
      <Card className="bg-white">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded bg-green-100 text-green-700 text-sm font-medium mb-2">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {appointmentDetails?.status === 'completed' ? 'Completed' : appointmentDetails?.status}
              </div>
              <div className="text-sm text-gray-500">
                {format(new Date(completedAt), 'EEE dd MMM yyyy')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="bg-black text-white">
                Rebook
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => setShowRefundDialog(true)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Refund sale
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit sale details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowAddNoteDialog(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Add a note
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onSelect={() => setShowVoidDialog(true)}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Void sale
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold">
              {appointmentDetails?.customer?.full_name || 'No name provided'}
            </h4>
            <p className="text-gray-600">{appointmentDetails?.customer?.email || 'No email provided'}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Sale #{appointmentId.slice(0, 8)}</h4>
            <p className="text-sm text-gray-500 mb-4">
              {format(new Date(completedAt), 'EEE dd MMM yyyy')}
            </p>

            {appointmentDetails?.bookings.map((item) => (
              <div key={item.id} className="py-2 flex justify-between items-start border-b">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.service?.name || item.package?.name}
                    {item.status === 'refunded' && (
                      <span className="ml-2 text-red-500 text-sm">(Refunded)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(completedAt), 'h:mma, dd MMM yyyy')}
                    {item.employee && ` • Stylist: ${item.employee.name}`}
                  </p>
                </div>
                <p className="text-right text-gray-900">₹{item.price_paid.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountType !== 'none' && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount ({discountType === 'percentage' ? 
                    `${discountValue}%` : 
                    '₹' + discountValue
                  })
                </span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Paid with {paymentMethod === 'cash' ? 'Cash' : 'Online'}</span>
              <div className="flex items-center">
                {paymentMethod === 'cash' ? (
                  <Banknote className="h-4 w-4 mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                ₹{total.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refund Sale</DialogTitle>
            <DialogDescription>
              Select the items you want to refund
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Select Items</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Select All</span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {refundableItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">₹{item.price.toFixed(2)}</p>
                    {item.employee && (
                      <p className="text-sm text-gray-500">Stylist: {item.employee.name}</p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={refundItems[item.id] || false}
                    onChange={(e) => 
                      setRefundItems({
                        ...refundItems,
                        [item.id]: e.target.checked
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Processed By</Label>
                <Select
                  value={refundedBy}
                  onValueChange={setRefundedBy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Refund Reason</Label>
                <Select
                  value={refundReason}
                  onValueChange={(value) => setRefundReason(value as RefundData['reason'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_dissatisfaction">Customer Dissatisfaction</SelectItem>
                    <SelectItem value="service_quality_issue">Service Quality Issue</SelectItem>
                    <SelectItem value="scheduling_error">Scheduling Error</SelectItem>
                    <SelectItem value="health_concern">Health Concern</SelectItem>
                    <SelectItem value="price_dispute">Price Dispute</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {refundReason === 'other' && (
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    placeholder="Please provide details for the refund..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefundSale}>
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to void this sale? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoidSale}>
              Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px]"
            placeholder="Enter your note here..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
