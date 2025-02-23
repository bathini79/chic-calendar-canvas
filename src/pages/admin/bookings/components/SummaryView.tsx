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
import type { Appointment, RefundData } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const { fetchAppointmentDetails, updateAppointmentStatus } = useAppointmentActions();

  useEffect(() => {
    loadAppointmentDetails();
    fetchEmployees();
  }, [appointmentId]);

  useEffect(() => {
    if (selectAll) {
      const allItemIds = selectedItems.reduce((acc, item) => {
        acc[item.id] = true;
        return acc;
      }, {} as {[key: string]: boolean});
      setRefundItems(allItemIds);
    }
  }, [selectAll, selectedItems]);

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

      const bookingIds = appointmentDetails.bookings
        .filter(booking => {
          const itemId = booking.service_id || booking.package_id;
          return itemId && selectedItemIds.includes(itemId);
        })
        .map(booking => booking.id);

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

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'refunded',
          refunded_by: refundedBy,
          refund_reason: refundReason,
          refund_notes: refundNotes
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      await loadAppointmentDetails();
      setShowRefundDialog(false);
      toast.success('Refund processed successfully');
    } catch (error: any) {
      console.error("Error refunding sale:", error);
      toast.error("Failed to process refund");
    }
  };

  if (!appointmentDetails) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card className="bg-white">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded bg-green-100 text-green-700 text-sm font-medium mb-2">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {appointmentDetails.status === 'completed' ? 'Completed' : appointmentDetails.status}
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
              {appointmentDetails.customer?.full_name || 'No name provided'}
            </h4>
            <p className="text-gray-600">{appointmentDetails.customer?.email || 'No email provided'}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Sale #{appointmentId.slice(0, 8)}</h4>
            <p className="text-sm text-gray-500 mb-4">
              {format(new Date(completedAt), 'EEE dd MMM yyyy')}
            </p>

            {selectedItems.map((item) => (
              <div key={item.id} className="py-2 flex justify-between items-start border-b">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(completedAt), 'h:mma, dd MMM yyyy')}
                    {item.employee && ` • Stylist: ${item.employee.name}`}
                  </p>
                </div>
                <p className="text-right text-gray-900">₹{item.price.toFixed(2)}</p>
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
              <span>Paid with {appointmentDetails.payment_method === 'cash' ? 'Cash' : 'Online'}</span>
              <div className="flex items-center">
                {appointmentDetails.payment_method === 'cash' ? (
                  <Banknote className="h-4 w-4 mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                ₹{total.toFixed(2)}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(completedAt), "EEE dd MMM yyyy 'at' h:mma")}
            </p>
          </div>
        </CardContent>
      </Card>

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
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Select All</span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedItems.map((item) => (
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
