import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  CreditCard, 
  Banknote,
  MoreVertical,
  PencilLine,
  FileText,
  Mail,
  Printer,
  Download,
  Ban,
  Calendar
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
import type { Appointment, RefundData, SummaryViewProps, TransactionDetails } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
}) => {
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [note, setNote] = useState('');
  const [refundItems, setRefundItems] = useState<{[key: string]: boolean}>({});
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [refundReason, setRefundReason] = useState<RefundData['reason']>('customer_dissatisfaction');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundedBy, setRefundedBy] = useState('');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { fetchAppointmentDetails, updateAppointmentStatus, processRefund } = useAppointmentActions();

  useEffect(() => {
    loadAppointmentDetails();
    fetchEmployees();
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    const details = await fetchAppointmentDetails(appointmentId);
    if (details) {
      setTransactionDetails(details);
    }
  };

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

  const handleRefundSale = async () => {
    if (!transactionDetails || !refundedBy) {
      toast.error("Please select who processed the refund");
      return;
    }

    try {
      const selectedBookingIds = Object.entries(refundItems)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);

      if (selectedBookingIds.length === 0) {
        toast.error("Please select at least one item to refund");
        return;
      }

      const refundData: RefundData = {
        reason: refundReason,
        notes: refundNotes,
        refundedBy: refundedBy
      };

      const success = await processRefund(appointmentId, selectedBookingIds, refundData);

      if (success) {
        await loadAppointmentDetails();
        setShowRefundDialog(false);
        toast.success('Refund processed successfully');
      }
    } catch (error: any) {
      console.error("Error refunding sale:", error);
      toast.error("Failed to process refund");
    }
  };

  const getStatusBadgeColor = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'refunded':
        return 'bg-red-100 text-red-700';
      case 'partially_refunded':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

  if (!transactionDetails) {
    return <div>Loading...</div>;
  }

  const { originalSale, refund } = transactionDetails;

  return (
    <>
      <div className="space-y-6">
        {/* Original Sale Card */}
        <Card className="bg-white">
          <CardContent className="p-6 space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex-1">
                <div className={`inline-flex items-center px-2.5 py-1 rounded ${getStatusBadgeColor(originalSale.status)} text-sm font-medium mb-2`}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {originalSale.status}
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(originalSale.end_time), 'EEE dd MMM yyyy')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-black text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  Rebook
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {!refund && (
                      <DropdownMenuItem onSelect={() => setShowRefundDialog(true)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Refund sale
                      </DropdownMenuItem>
                    )}
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
                      Email receipt
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Printer className="mr-2 h-4 w-4" />
                      Print receipt
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-semibold">
                {originalSale.customer?.full_name || 'No name provided'}
              </h4>
              <p className="text-gray-600">{originalSale.customer?.email || 'No email provided'}</p>
            </div>

            {/* Original Sale Details */}
            <div className="mt-6">
              <h4 className="font-medium mb-2">Sale #{originalSale.id.slice(0, 8)}</h4>
              <p className="text-sm text-gray-500 mb-4">
                {format(new Date(originalSale.end_time), 'EEE dd MMM yyyy')}
              </p>

              {originalSale.bookings.map((booking) => {
                const itemName = booking.service?.name || booking.package?.name;
                const itemPrice = booking.price_paid;

                return (
                  <div key={booking.id} className="py-2 flex justify-between items-start border-b">
                    <div className="flex-1">
                      <p className="font-medium">{itemName}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(booking.start_time), 'h:mma, dd MMM yyyy')}
                        {booking.employee && ` • Stylist: ${booking.employee.name}`}
                      </p>
                    </div>
                    <p className="text-right text-gray-900">₹{itemPrice.toFixed(2)}</p>
                  </div>
                );
              })}

              {/* Sale Totals */}
              <div className="space-y-2 pt-4 border-t mt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{originalSale.original_total_price?.toFixed(2)}</span>
                </div>
                {originalSale.discount_type !== 'none' && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Discount ({originalSale.discount_type === 'percentage' ?
                        `${originalSale.discount_value}%` :
                        '₹' + originalSale.discount_value
                      })
                    </span>
                    <span>-₹{originalSale.discount_value?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total</span>
                  <span>₹{originalSale.total_price.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Paid with {originalSale.payment_method === 'cash' ? 'Cash' : 'Online'}</span>
                  <div className="flex items-center">
                    {originalSale.payment_method === 'cash' ? (
                      <Banknote className="h-4 w-4 mr-1" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-1" />
                    )}
                    ₹{originalSale.total_price.toFixed(2)}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(originalSale.created_at), "EEE dd MMM yyyy 'at' h:mma")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Card */}
        {refund && (
          <Card className="bg-white border-red-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-flex items-center px-2.5 py-1 rounded bg-red-100 text-red-700 text-sm font-medium mb-2">
                    Refund #{refund.id.slice(0, 8)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(refund.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
                <p className="text-lg font-semibold text-red-600">
                  -₹{Math.abs(refund.total_price).toFixed(2)}
                </p>
              </div>
              
              {refund.refund_reason && (
                <div className="text-sm">
                  <p className="font-medium">Reason:</p>
                  <p className="text-gray-600">{refund.refund_reason}</p>
                </div>
              )}
              {refund.refund_notes && (
                <div className="text-sm">
                  <p className="font-medium">Notes:</p>
                  <p className="text-gray-600">{refund.refund_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
            <Button variant="destructive" onClick={() => handleVoidSale}>
              Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {nonRefundedBookings.map((booking) => {
                const itemName = booking.service?.name || booking.package?.name;
                const itemPrice = booking.price_paid;
                
                return (
                  <div key={booking.id} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">{itemName}</p>
                      <p className="text-sm text-gray-500">₹{itemPrice.toFixed(2)}</p>
                      {booking.employee && (
                        <p className="text-sm text-gray-500">Stylist: {booking.employee.name}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={refundItems[booking.id] || false}
                      onChange={(e) => 
                        setRefundItems({
                          ...refundItems,
                          [booking.id]: e.target.checked
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                );
              })}
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

      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Note</DialogTitle>
          </DialogHeader>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-32 p-2 border rounded"
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
