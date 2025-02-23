
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  ClipboardList, 
  CreditCard, 
  Banknote, 
  MoreVertical,
  AlertCircle,
  XCircle,
  RotateCcw
} from "lucide-react";
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface SummaryViewProps {
  appointmentId: string;
  selectedItems: Array<{
    id: string;
    name: string;
    price: number;
    type: 'service' | 'package';
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
  const [showVoidDialog, setShowVoidDialog] = React.useState(false);
  const [showRefundDialog, setShowRefundDialog] = React.useState(false);
  const [confirmationStep, setConfirmationStep] = React.useState<1 | 2>(1);

  const handleVoidSale = async () => {
    try {
      // Here you would implement the void sale logic
      // For now, we'll just show a success message
      toast.success("Sale voided successfully");
      setShowVoidDialog(false);
      setConfirmationStep(1);
    } catch (error) {
      toast.error("Failed to void sale");
    }
  };

  const handleRefundSale = async () => {
    try {
      // Here you would implement the refund logic
      // For now, we'll just show a success message
      toast.success("Sale refunded successfully");
      setShowRefundDialog(false);
      setConfirmationStep(1);
    } catch (error) {
      toast.error("Failed to refund sale");
    }
  };

  return (
    <>
      <Card className="bg-white">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Payment Completed</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500">
                {format(new Date(completedAt), 'dd MMM yyyy, hh:mm a')}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setShowVoidDialog(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Void Sale
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowRefundDialog(true)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refund Sale
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Transaction ID</span>
              <span className="font-mono">{appointmentId}</span>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Items</h4>
              {selectedItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex justify-between text-sm py-1">
                  <span>
                    {item.name}
                    <span className="ml-2 text-gray-500 text-xs">
                      ({item.type})
                    </span>
                  </span>
                  <span>₹{item.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {discountType !== 'none' && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Discount ({discountType === 'percentage' ? `${discountValue}%` : '₹' + discountValue})
                  </span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total Paid</span>
                <span>₹{total}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Payment Method</span>
                <span className="flex items-center">
                  {paymentMethod === 'cash' ? <Banknote className="h-4 w-4 mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                  {paymentMethod === 'cash' ? 'Cash' : 'Online'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button className="w-full" variant="outline" onClick={() => window.print()}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Void Sale Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {confirmationStep === 1 ? "Void Sale" : "Confirm Void Sale"}
            </DialogTitle>
            <DialogDescription>
              {confirmationStep === 1 ? (
                "Are you sure you want to void this sale? This action cannot be undone."
              ) : (
                "Please confirm once again that you want to void this sale. This is your final confirmation."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVoidDialog(false);
                setConfirmationStep(1);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmationStep === 1) {
                  setConfirmationStep(2);
                } else {
                  handleVoidSale();
                }
              }}
            >
              {confirmationStep === 1 ? "Continue" : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Sale Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {confirmationStep === 1 ? "Refund Sale" : "Confirm Refund"}
            </DialogTitle>
            <DialogDescription>
              {confirmationStep === 1 ? (
                "Are you sure you want to refund this sale? This action cannot be undone."
              ) : (
                "Please confirm once again that you want to refund this sale. This is your final confirmation."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRefundDialog(false);
                setConfirmationStep(1);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmationStep === 1) {
                  setConfirmationStep(2);
                } else {
                  handleRefundSale();
                }
              }}
            >
              {confirmationStep === 1 ? "Continue" : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
