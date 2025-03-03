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
  Clock,
  Package
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
import type { RefundData, TransactionDetails } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRefundReason } from '../utils/formatters';

export interface SummaryViewProps {
  appointmentId: string
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId
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
    if (!transactionDetails?.originalSale || !refundedBy) {
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

  const handleVoidSale = async () => {
    if (!transactionDetails?.originalSale) return;

    try {
      const bookingIds = transactionDetails.originalSale.bookings.map(booking => booking.id);
      
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

  const getGroupedBookings = (transaction: any) => {
    if (!transaction) return [];

    const packageBookings = transaction.bookings.filter(b => b.package_id);
    const serviceBookings = transaction.bookings.filter(b => b.service_id && !b.package_id);
    
    const packageGroups = packageBookings.reduce((groups, booking) => {
      const packageId = booking.package_id;
      if (!groups[packageId]) {
        groups[packageId] = {
          package: booking.package,
          bookings: []
        };
      }
      groups[packageId].bookings.push(booking);
      return groups;
    }, {});

    const result = [
      ...Object.values(packageGroups).map((group: any) => ({
        type: 'package',
        ...group
      })),
      ...serviceBookings.map(booking => ({
        type: 'service',
        booking
      }))
    ];

    return result;
  };

  if (!transactionDetails) {
    return <div>Loading...</div>;
  }

  const { originalSale, refunds } = transactionDetails;

  const allTransactions = [
    ...refunds,
    originalSale
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto px-1">
        {allTransactions.map((transaction) => {
          const isRefund = transaction.transaction_type === 'refund';
          const groupedBookings = getGroupedBookings(transaction);
          
          return (
            <Card key={transaction.id} className={`bg-white h-full ${isRefund ? 'border-red-200' : ''}`}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex-1">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded ${
                      isRefund ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    } text-sm font-medium mb-2`}>
                      {isRefund ? (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Refund #{transaction.id.slice(0, 6)}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Sale #{transaction.id.slice(0, 6)}
                       </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {format(new Date(transaction.created_at), 'EEE dd MMM yyyy, h:mm a')}
                    </div>
                  </div>
                  {!isRefund && (
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
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-base font-semibold">
                    {transaction.customer?.full_name || 'No name provided'}
                  </h4>
                  <p className="text-gray-600">{transaction.customer?.email || 'No email provided'}</p>
                </div>

                <div className="overflow-y-auto">
                  <h4 className="font-medium mb-4">{isRefund ? 'Refunded Items' : 'Items'}</h4>
                  
                  {groupedBookings.map((item: any, idx: number) => {
                    if (item.type === 'package') {
                      return (
                        <div key={idx} className="mb-4">
                          <div className="py-2 flex justify-between items-start border-b bg-slate-50 px-2 rounded-t-md">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <p className="font-medium line-clamp-1">{item.package.name}</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {item.bookings.length} services
                              </p>
                            </div>
                            <p className={`text-right ${isRefund ? 'text-red-600' : 'text-gray-900'}`}>
                              {isRefund ? '-' : ''}₹{item.package.price.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="pl-6 border-l-2 border-gray-300 ml-4 mt-2 space-y-1">
                            {item.bookings.map((booking: any) => {
                              const servicePrice = booking.service && 
                                                  booking.package_selling_price !== null && 
                                                  booking.package_selling_price !== undefined
                                ? booking.package_selling_price
                                : booking.service?.selling_price;
                                
                              return (
                                <div key={booking.id} className="py-1 flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm line-clamp-1">{booking.service?.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {booking.start_time && format(new Date(booking.start_time), 'h:mma')}{' '}
                                      {booking.employee && ` • ${booking.employee.name}`}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {servicePrice ? `₹${servicePrice.toFixed(2)}` : ''}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      const booking = item.booking;
                      return (
                        <div key={booking.id} className="py-2 flex justify-between items-start border-b">
                          <div className="flex-1">
                            <p className="font-medium text-sm line-clamp-1">{booking.service?.name}</p>
                            <p className="text-xs text-gray-500">
                              {booking.start_time && format(new Date(booking.start_time), 'h:mma')}{' '}
                              {booking.employee && ` • ${booking.employee.name}`}
                            </p>
                          </div>
                          <p className={`text-right ${isRefund ? 'text-red-600' : 'text-gray-900'}`}>
                            {isRefund ? '-' : ''}₹{booking.price_paid.toFixed(2)}
                          </p>
                        </div>
                      );
                    }
                  })}
                </div>

                <div className="space-y-1 pt-2 border-t">
                  {transaction.discount_type !== 'none' && transaction.discount_value > 0 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>
                        Discount ({transaction.discount_type === 'percentage' ? 
                          `${transaction.discount_value}%` : 
                          '₹' + transaction.discount_value
                        })
                      </span>
                      <span>-₹{transaction.discount_value.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total</span>
                    <span className={isRefund ? 'text-red-600' : ''}>
                      {isRefund ? '-' : ''}₹{Math.abs(transaction.total_price).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">
                      Paid with {transaction.payment_method === 'cash' ? 'Cash' : 'Online'}
                    </span>
                    <div className="flex items-center">
                      {transaction.payment_method === 'cash' ? (
                        <Banknote className="h-4 w-4 mr-1" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-1" />
                      )}
                      ₹{Math.abs(transaction.total_price).toFixed(2)}
                    </div>
                  </div>
                </div>

                {isRefund && transaction.refund_reason && (
                  <div className="space-y-2 pt-4 border-t">
                    {transaction.refund_reason && (
                      <div>
                        <p className="font-medium text-xs">Reason:</p>
                        <p className="text-gray-600">{formatRefundReason(transaction.refund_reason)}</p>
                      </div>
                    )}
                    {transaction.refund_notes && (
                      <div>
                        <p className="font-medium text-sm">Notes:</p>
                        <p className="text-gray-600">{transaction.refund_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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
            <Button variant="destructive" onClick={handleVoidSale}>
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
                  onChange={(e) => {
                    setSelectAll(e.target.checked);
                    const allBookingIds = transactionDetails.originalSale.bookings
                      .filter(booking => booking.status !== 'refunded')
                      .reduce((acc, booking) => {
                        acc[booking.id] = e.target.checked;
                        return acc;
                      }, {});
                    setRefundItems(allBookingIds);
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Select All</span>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1">
              {transactionDetails.originalSale.bookings.filter(
                booking => booking.status !== 'refunded'
              ).map((booking) => {
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
