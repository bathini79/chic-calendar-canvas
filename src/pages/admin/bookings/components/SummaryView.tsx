import React, { useEffect, useState } from 'react';
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
  Package,
  MapPin,
  Percent,
  Star
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
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRefundReason } from '../utils/formatters';
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const ReceiptDetails: React.FC<{ 
  customer: any; 
  items: any[]; 
  subTotal: number | undefined; 
  taxAmount: number | undefined; 
  membershipName: string | undefined; 
  membershipDiscount: number | undefined; 
  totalPrice: number | undefined; 
  paymentMethod: string; 
  receiptNumber: string | undefined; 
  onAddAnother: (() => void) | undefined; 
}> = ({
  customer,
  items,
  subTotal,
  taxAmount,
  membershipName,
  membershipDiscount,
  totalPrice,
  paymentMethod,
  receiptNumber,
  onAddAnother,
}) => {
  return (
    <Card className="bg-white h-full border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex-1">
            <div className="inline-flex items-center px-2.5 py-1 rounded bg-green-100 text-green-700 text-sm font-medium mb-2">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              New Sale
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-base font-semibold">
            {customer.full_name || 'No name provided'}
          </h4>
          {customer.phone_number && (
            <p className="text-gray-600">{customer.phone_number}</p>
          )}
        </div>

        <div className="overflow-y-auto">
          <h4 className="font-medium mb-4">Items</h4>
          {items && items.map((item, idx) => (
            <div key={idx} className="py-2 flex justify-between items-start border-b">
              <div className="flex-1">
                <p className="font-medium text-sm line-clamp-1">
                  {item.type === 'package' && <Package className="h-4 w-4 inline mr-1" />}
                  {item.name}
                </p>
                {item.employee && (
                  <p className="text-xs text-gray-500">
                    Stylist: {item.employee.name}
                  </p>
                )}
                {item.duration && (
                  <p className="text-xs text-gray-500">
                    Duration: {item.duration} minutes
                  </p>
                )}
              </div>
              <p className="text-right text-gray-900">
                {formatPrice(item.price)}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-1 pt-2 border-t">
          {subTotal !== undefined && (
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subTotal)}</span>
            </div>
          )}

          {taxAmount !== undefined && taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
          )}

          {membershipName && membershipDiscount && membershipDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                {membershipName} Discount
              </span>
              <span>-{formatPrice(membershipDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total</span>
            <span>{formatPrice(totalPrice || 0)}</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between text-xs">
            <span className="capitalize">
              Paid with {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'Online'}
            </span>
            <div className="flex items-center">
              {paymentMethod === 'cash' ? (
                <Banknote className="h-4 w-4 mr-1" />
              ) : (
                <CreditCard className="h-4 w-4 mr-1" />
              )}
              {formatPrice(totalPrice || 0)}
            </div>
          </div>
        </div>

        {receiptNumber && (
          <div className="pt-2 text-center text-xs text-gray-500">
            Receipt #: {receiptNumber}
          </div>
        )}

        {onAddAnother && (
          <div className="flex justify-center mt-4">
            <Button onClick={onAddAnother} className="mx-auto">
              Add Another {items && items[0]?.type === 'membership' ? 'Membership' : 'Appointment'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  customer,
  totalPrice,
  items,
  paymentMethod,
  onAddAnother,
  receiptNumber,
  taxAmount,
  subTotal,
  membershipName,
  membershipDiscount,
}) => {
  const navigate = useNavigate();
  const [showVoidDialog, setShowVoidDialog] = React.useState(false);
  const [showRefundDialog, setShowRefundDialog] = React.useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = React.useState(false);
  const [showEditSaleDialog, setShowEditSaleDialog] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [refundItems, setRefundItems] = React.useState<{[key: string]: boolean}>({});
  const [transactionDetails, setTransactionDetails] = React.useState<TransactionDetails | null>(null);
  const [refundReason, setRefundReason] = React.useState<RefundData['reason']>('customer_dissatisfaction');
  const [refundNotes, setRefundNotes] = React.useState('');
  const [refundedBy, setRefundedBy] = React.useState('');
  const [employees, setEmployees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectAll, setSelectAll] = React.useState(false);
  const [locations, setLocations] = useState<{id: string; name: string}[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<{[key: string]: string}>({});
  const [taxRates, setTaxRates] = useState<{id: string; name: string; percentage: number}[]>([]);
  const { fetchAppointmentDetails, updateAppointmentStatus, processRefund, updateBookingStylelist } = useAppointmentActions();
  const { appointment } = useAppointmentDetails(appointmentId);
  React.useEffect(() => {
    if (appointmentId) {
      loadAppointmentDetails();
    }
    fetchEmployees();
    fetchLocations();
    fetchTaxRates();
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    if (!appointmentId) return;
    
    const details = await fetchAppointmentDetails(appointmentId);
    if (details) {
      setTransactionDetails(details);
      
      if (details.originalSale && details.originalSale.bookings) {
        setSelectedBookings(details.originalSale.bookings);
        
        const initialStylists: {[key: string]: string} = {};
        details.originalSale.bookings.forEach(booking => {
          if (booking.employee_id) {
            initialStylists[booking.id] = booking.employee_id;
          }
        });
        setSelectedEmployees(initialStylists);
      }
    }
  };

  const fetchTaxRates = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('id, name, percentage');

      if (error) throw error;
      setTaxRates(data || []);
    } catch (error) {
      console.error('Error fetching tax rates:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
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

  const getLocationNameById = (locationId?: string | null) => {
    if (!locationId) return 'Unknown Location';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const getTaxNameById = (taxId?: string | null) => {
    if (!taxId) return null;
    const tax = taxRates.find(tax => tax.id === taxId);
    return tax ? tax.name : null;
  };

  const handleSaveEdits = async () => {
    if (!appointmentId) return;
    
    try {
      const updatePromises = Object.entries(selectedEmployees).map(([bookingId, employeeId]) => {
        return updateBookingStylelist(bookingId, employeeId);
      });
      
      await Promise.all(updatePromises);
      await loadAppointmentDetails();
      setShowEditSaleDialog(false);
      toast.success('Sale details updated successfully');
    } catch (error) {
      console.error("Error updating sale details:", error);
      toast.error('Failed to update sale details');
    }
  };

  const renderNewReceipt = () => {
    if (!customer) {
      return <div>Missing customer information</div>;
    }

    return (
      <ReceiptDetails
        customer={customer}
        items={items}
        subTotal={subTotal}
        taxAmount={taxAmount}
        membershipName={membershipName}
        membershipDiscount={membershipDiscount}
        totalPrice={totalPrice}
        paymentMethod={paymentMethod}
        receiptNumber={receiptNumber}
        onAddAnother={onAddAnother}
      />
    );
  };

  if (transactionDetails) {
    const getGroupedBookings = (transaction: any) => {
      if (!transaction) return [];
  
      const packageBookings = transaction.bookings.filter(b => b.package_id);
      const serviceBookings = transaction.bookings.filter(b => b.service_id && !b.package_id);
      
      const packageGroups = packageBookings.reduce((groups, booking) => {
        const packageId = booking.package_id;
        if (!groups[packageId]) {
          groups[packageId] = {
            package: booking.package,
            bookings: [],
            totalPricePaid: 0
          };
        }
        groups[packageId].bookings.push(booking);
        groups[packageId].totalPricePaid += booking.price_paid || 0;
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
  
    if (!transactionDetails) {
      return <div>Loading...</div>;
    }
  
    const { originalSale, refunds } = transactionDetails;
  
    const allTransactions = [
      ...refunds,
      originalSale
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  console.log("allTransactions",allTransactions)
    return (
      <>
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto px-1">
          {allTransactions.map((transaction) => {
            const isRefund = transaction.transaction_type === 'refund';
            const groupedBookings = getGroupedBookings(transaction);
            const locationName = getLocationNameById(transaction.location);
            const taxName = getTaxNameById(transaction.tax_id);
            const subtotal = transaction.bookings.reduce((sum, booking) => sum + (booking.price_paid || 0), 0);
            
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
                      {locationName && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <MapPin className="h-4 w-4" />
                          {locationName}
                        </div>
                      )}
                    </div>
                    {!isRefund && (
                      <div className="flex items-center gap-2">
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
                            <DropdownMenuItem onSelect={() => setShowEditSaleDialog(true)}>
                              <PencilLine className="mr-2 h-4 w-4" />
                              Edit sale details
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
                    <p className="text-gray-600">{transaction.customer?.phone_number}</p>
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
                                {isRefund ? '-' : ''}₹{item.totalPricePaid.toFixed(2)}
                              </p>
                            </div>
                            
                            <div className="pl-6 border-l-2 border-gray-300 ml-4 mt-2 space-y-1">
                              {item.bookings.map((booking: any) => {
                                const servicePrice = booking.price_paid || 0;
                                  
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
                                      ₹{servicePrice.toFixed(2)}
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
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>{taxName ? `Tax (${taxName})` : 'Tax'}</span>
                      <span>₹{transaction.tax_amount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {transaction.membership_name} Discount
                      </span>
                      <span>-₹{transaction.membership_discount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        {transaction.discount_value ?`Discount (${transaction.discount_type === 'percentage' ? 
                          `${transaction.discount_value}%` : 
                          '₹' + transaction.discount_value
                        })` : null}
                      </span>
                      <span>
                      {transaction.discount_value > 0 ? 
                        (transaction.discount_type === 'percentage' 
                          ? `-₹${(subtotal * (transaction.discount_value / 100)).toFixed(2)}`
                          : `-₹${transaction.discount_value.toFixed(2)}`) 
                        : null}
                      </span>
                    </div>
                    {transaction?.round_off_difference ? <div className="flex justify-between text-sm">
                      <span>Round off</span>
                      <span>₹{formatPrice(transaction?.round_off_difference)}</span>
                    </div>: ""}
                    
                    
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
                        Paid with {transaction.payment_method === 'cash' ? 'Cash' : transaction.payment_method === 'card' ? 'Card' : 'Online'}
                      </span>
                    </div>
                  </div>
  
                  {(transaction.points_earned > 0 || transaction.points_redeemed > 0) && (
                    <div className="pt-2 border-t text-xs text-gray-600">
                      {transaction.points_earned > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            Points Earned
                          </span>
                          <span className="text-green-600">+{transaction.points_earned}</span>
                        </div>
                      )}
                      {transaction.points_redeemed > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            Points Redeemed
                          </span>
                          <span className="text-amber-600">-{transaction.points_redeemed}</span>
                        </div>
                      )}
                    </div>
                  )}
  
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
                          <p className="font-medium text-xs">Notes:</p>
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
        
        <Dialog open={showEditSaleDialog} onOpenChange={setShowEditSaleDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Sale Details</DialogTitle>
              <DialogDescription>
                Update stylist assignments for services
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="max-h-96 overflow-y-auto space-y-4">
                {selectedBookings.map((booking) => {
                  const serviceName = booking.service?.name || (booking.package?.name + " (Package)");
                  return (
                    <div key={booking.id} className="py-3 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{serviceName}</h3>
                          {booking.service?.duration && (
                            <p className="text-sm text-gray-500">Duration: {booking.service.duration} min</p>
                          )}
                          {booking.start_time && (
                            <p className="text-sm text-gray-500">
                              {format(new Date(booking.start_time), 'MMM dd, h:mm a')}
                            </p>
                          )}
                        </div>
                        <div className="w-60">
                          <Label htmlFor={`stylist-${booking.id}`} className="mb-1 block">
                            Assigned Stylist
                          </Label>
                          <Select
                            value={selectedEmployees[booking.id] || booking.employee_id || ''}
                            onValueChange={(value) => {
                              setSelectedEmployees({
                                ...selectedEmployees,
                                [booking.id]: value
                              });
                            }}
                          >
                            <SelectTrigger id={`stylist-${booking.id}`}>
                              <SelectValue placeholder="Select stylist" />
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditSaleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdits}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return renderNewReceipt();
};
