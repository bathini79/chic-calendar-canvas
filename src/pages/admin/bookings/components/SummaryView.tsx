import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner';
import { Appointment, Service, Package, RefundData } from '../types';
import { useAppointmentActions } from '../hooks/useAppointmentActions';

interface SummaryViewProps {
  appointmentId?: string;
  customer: any;
  services: Service[];
  packages: Package[];
  stylists: Record<string, string>;
  employees: any[];
  date: Date;
  time: string;
  discountType: 'none' | 'fixed' | 'percentage';
  discountValue: number;
  paymentMethod: string;
  notes: string;
  calculateTotal: (services: string[], packages: string[], servicesData: Service[], packagesData: Package[], customizedServices?: any) => number;
  customizedServices?: any;
  isLoading: boolean;
  onSave: () => void;
  onEdit: () => void;
}

export function SummaryView({
  appointmentId,
  customer,
  services,
  packages,
  stylists,
  employees,
  date,
  time,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  calculateTotal,
  customizedServices,
  isLoading,
  onSave,
  onEdit
}: SummaryViewProps) {
  const { fetchAppointmentDetails, processRefund } = useAppointmentActions();
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails(appointmentId)
        .then(details => {
          setTransactionDetails(details);
        });
    }
  }, [appointmentId, fetchAppointmentDetails]);

  const totalPrice = calculateTotal(
    services.map(s => s.id),
    packages.map(p => p.id),
    services,
    packages,
    customizedServices
  );

  const calculateDiscountedPrice = () => {
    let discountedPrice = totalPrice;
    if (discountType === 'fixed') {
      discountedPrice = Math.max(0, totalPrice - discountValue);
    } else if (discountType === 'percentage') {
      discountedPrice = totalPrice * (1 - discountValue / 100);
    }
    return discountedPrice;
  };

  const discountedPrice = calculateDiscountedPrice();

  const getEmployeeName = (itemId: string) => {
    const employeeId = stylists[itemId];
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : 'Any Stylist';
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const refundData: RefundData = {
      appointment_id: transactionDetails.id,
      reason: refundReason,
      notes: refundNotes,
      refundedBy: "system" // Or replace with the actual user ID if available
    };
    
    processRefund(transactionDetails.id, selectedBookings, refundData);
    setShowRefundModal(false);
  };

  const handleBookingSelection = (bookingId: string) => {
    setSelectedBookings(prev => {
      if (prev.includes(bookingId)) {
        return prev.filter(id => id !== bookingId);
      } else {
        return [...prev, bookingId];
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Appointment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={`https://avatar.vercel.sh/${customer.email}.png`} />
              <AvatarFallback>{customer.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{customer.full_name}</h2>
              <p className="text-gray-500">{customer.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-semibold">Date & Time</h3>
              <p className="text-gray-500">{date.toLocaleDateString()} at {time}</p>
            </div>
            <div>
              <h3 className="text-md font-semibold">Payment Method</h3>
              <p className="text-gray-500">{paymentMethod}</p>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-md font-semibold">Services</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map(service => (
                  <TableRow key={service.id}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{getEmployeeName(service.id)}</TableCell>
                    <TableCell className="text-right">₹{service.selling_price}</TableCell>
                  </TableRow>
                ))}
                {packages.map(pkg => (
                  <TableRow key={pkg.id}>
                    <TableCell>{pkg.name}</TableCell>
                    <TableCell>{getEmployeeName(pkg.id)}</TableCell>
                    <TableCell className="text-right">₹{pkg.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">₹{totalPrice}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-semibold">Discount</h3>
              <p className="text-gray-500">
                {discountType === 'none' ? 'No Discount' : `${discountValue} ${discountType === 'fixed' ? '₹' : '%'}`}
              </p>
            </div>
            <div>
              <h3 className="text-md font-semibold">Total (After Discount)</h3>
              <p className="text-gray-500">₹{discountedPrice}</p>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-md font-semibold">Notes</h3>
            <p className="text-gray-500">{notes || 'No notes provided'}</p>
          </div>
        </CardContent>
      </Card>
      
      {transactionDetails?.originalSale && transactionDetails?.refunds && (
        <Card>
          <CardHeader>
            <CardTitle>Refund Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Original Transaction</h3>
              <p>
                <strong>ID:</strong> {transactionDetails.originalSale.id}
              </p>
              <p>
                <strong>Status:</strong> {transactionDetails.originalSale.status}
              </p>
              <p>
                <strong>Total Price:</strong> ₹{transactionDetails.originalSale.total_price}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Refunds</h3>
              {transactionDetails.refunds.length === 0 ? (
                <p>No refunds processed for this transaction.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Select</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionDetails.refunds.map(refund => (
                      <TableRow key={refund.id}>
                        <TableCell>{refund.id}</TableCell>
                        <TableCell>{refund.refund_reason}</TableCell>
                        <TableCell>{refund.refund_notes}</TableCell>
                        <TableCell className="text-right">₹{refund.total_price}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="checkbox"
                            checked={selectedBookings.includes(refund.id)}
                            onChange={() => handleBookingSelection(refund.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            
            <Button onClick={() => setShowRefundModal(true)}>Process Refund</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onEdit}>
          Edit Appointment
        </Button>
        <Button onClick={onSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Confirm Appointment'}
        </Button>
      </div>

      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Select the reason for the refund and add any relevant notes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <div>
              <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700">
                Refund Reason
              </label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select reason</option>
                <option value="customer_dissatisfaction">Customer Dissatisfaction</option>
                <option value="service_quality_issue">Service Quality Issue</option>
                <option value="scheduling_error">Scheduling Error</option>
                <option value="health_concern">Health Concern</option>
                <option value="price_dispute">Price Dispute</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="refundNotes" className="block text-sm font-medium text-gray-700">
                Refund Notes
              </label>
              <Textarea
                id="refundNotes"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Process Refund</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
