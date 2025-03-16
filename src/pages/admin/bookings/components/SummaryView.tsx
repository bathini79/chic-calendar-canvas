
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Download,
  Ban,
  Clock,
  Package,
  MapPin
} from "lucide-react";
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { StatusBadge } from "./StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SummaryViewProps {
  transactions: any[];
  onDateChange: (date: Date) => void;
  selectedDate: Date;
  appointmentId?: string;
}

export function SummaryView({ transactions, onDateChange, selectedDate, appointmentId }: SummaryViewProps) {
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState("all");

  const { refundAppointment } = useAppointmentActions(() => {
    // This will trigger a refetch after the refund
    onDateChange(selectedDate);
  });

  // Get location names for all transactions with locationId
  const locationIds = transactions
    .filter(t => t.location)
    .map(t => t.location);

  const { data: locations = [] } = useQuery({
    queryKey: ['locationNames', locationIds],
    queryFn: async () => {
      if (locationIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds);
      
      if (error) throw error;
      return data;
    },
    enabled: locationIds.length > 0
  });

  const getLocationName = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const handleRefundClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setRefundDialogOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (selectedTransaction && refundReason) {
      await refundAppointment(selectedTransaction.id, refundReason, refundNotes);
      setRefundDialogOpen(false);
      setSelectedTransaction(null);
      setRefundReason("");
      setRefundNotes("");
    }
  };

  // Filter transactions based on appointment type
  const filteredTransactions = transactions.filter(transaction => {
    switch (appointmentTypeFilter) {
      case "sales":
        return transaction.transaction_type === 'sale' && !transaction.refund_reason;
      case "refunds":
        return transaction.transaction_type === 'refund' || transaction.refund_reason;
      default:
        return true;
    }
  });

  // Calculate totals
  const salesTotals = transactions
    .filter(t => t.transaction_type === 'sale' && !t.refund_reason)
    .reduce((acc, t) => acc + Number(t.total_price), 0);

  const refundsTotals = transactions
    .filter(t => t.transaction_type === 'refund' || t.refund_reason)
    .reduce((acc, t) => acc + Number(t.total_price), 0);

  const netTotal = salesTotals - refundsTotals;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6 w-full">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Gross Sales</div>
            <div className="text-2xl font-bold">${salesTotals.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Refunds</div>
            <div className="text-2xl font-bold text-destructive">-${refundsTotals.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Net Total</div>
            <div className="text-2xl font-bold">${netTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={appointmentTypeFilter} onValueChange={setAppointmentTypeFilter}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <TabsContent value="all" className="m-0">
          <TransactionsList 
            transactions={filteredTransactions} 
            onRefund={handleRefundClick}
            getLocationName={getLocationName}
          />
        </TabsContent>
        <TabsContent value="sales" className="m-0">
          <TransactionsList 
            transactions={filteredTransactions} 
            onRefund={handleRefundClick}
            getLocationName={getLocationName}
          />
        </TabsContent>
        <TabsContent value="refunds" className="m-0">
          <TransactionsList 
            transactions={filteredTransactions} 
            onRefund={handleRefundClick}
            getLocationName={getLocationName}
          />
        </TabsContent>
      </Tabs>

      <RefundDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        transaction={selectedTransaction}
        refundReason={refundReason}
        setRefundReason={setRefundReason}
        refundNotes={refundNotes}
        setRefundNotes={setRefundNotes}
        onSubmit={handleRefundSubmit}
      />
    </div>
  );
}

interface TransactionsListProps {
  transactions: any[];
  onRefund: (transaction: any) => void;
  getLocationName: (locationId: string) => string;
}

function TransactionsList({ transactions, onRefund, getLocationName }: TransactionsListProps) {
  if (transactions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No transactions for this period</div>;
  }

  return (
    <div className="space-y-4">
      {transactions.map(transaction => {
        const isRefund = transaction.transaction_type === 'refund' || transaction.refund_reason;
        const customerName = transaction.customer?.full_name || 'Anonymous';
        
        return (
          <Card key={transaction.id} className={isRefund ? "border-destructive/20 bg-destructive/5" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between mb-2">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {customerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{customerName}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-4 w-4" />
                      {format(new Date(transaction.created_at), 'EEE dd MMM yyyy, h:mm a')}
                    </div>
                    {transaction.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4" />
                        {getLocationName(transaction.location)}
                      </div>
                    )}
                  </div>
                </div>
                {!isRefund && (
                  <div className="flex items-center gap-2">
                    <StatusBadge status={transaction.status} />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => onRefund(transaction)}
                      disabled={['refunded', 'voided'].includes(transaction.status)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Refund
                    </Button>
                  </div>
                )}
                {isRefund && (
                  <div className="flex items-center">
                    <div className="bg-destructive/20 text-destructive text-xs px-2 py-1 rounded">
                      Refunded
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Services/Packages</div>
                  <div className="text-sm">
                    {transaction.bookings.map((booking: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 mt-1">
                        {booking.package ? (
                          <Package className="h-3 w-3 mr-1" />
                        ) : null}
                        {booking.service?.name || booking.package?.name || 'Service'}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Payment Method</div>
                  <div className="text-sm capitalize">{transaction.payment_method || 'Cash'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Amount</div>
                  <div className={`text-lg font-bold ${isRefund ? 'text-destructive' : ''}`}>
                    {isRefund ? '-' : ''}${Number(transaction.total_price).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {transaction.refund_reason && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-muted-foreground">Refund Reason</div>
                  <div className="text-sm capitalize">{transaction.refund_reason.replace(/_/g, ' ')}</div>
                  {transaction.refund_notes && (
                    <div className="text-sm mt-1">{transaction.refund_notes}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  refundReason: string;
  setRefundReason: (reason: string) => void;
  refundNotes: string;
  setRefundNotes: (notes: string) => void;
  onSubmit: () => void;
}

function RefundDialog({
  open,
  onOpenChange,
  transaction,
  refundReason,
  setRefundReason,
  refundNotes,
  setRefundNotes,
  onSubmit,
}: RefundDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            This will refund the full amount of ${Number(transaction.total_price).toFixed(2)} to the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mb-4">
          <div>
            <label htmlFor="refund-reason" className="text-sm font-medium">Reason for Refund</label>
            <Select value={refundReason} onValueChange={setRefundReason}>
              <SelectTrigger id="refund-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="service_issue">Service Issue</SelectItem>
                <SelectItem value="scheduling_conflict">Scheduling Conflict</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="refund-notes" className="text-sm font-medium">Additional Notes</label>
            <Textarea 
              id="refund-notes" 
              value={refundNotes} 
              onChange={(e) => setRefundNotes(e.target.value)}
              placeholder="Add any additional notes about this refund"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onSubmit}
            disabled={!refundReason}
            className="bg-destructive hover:bg-destructive/90"
          >
            Issue Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
