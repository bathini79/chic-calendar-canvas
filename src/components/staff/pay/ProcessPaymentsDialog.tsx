import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, LoaderCircle } from "lucide-react";

interface ProcessPaymentsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  totalAmount: number;
  employeeCount: number;
  isSupplementary?: boolean;
}

export function ProcessPaymentsDialog({
  open,
  onClose,
  onConfirm,
  totalAmount,
  employeeCount,
  isSupplementary = false,
}: ProcessPaymentsDialogProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }
  
  // Handle confirm
  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error processing payments:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Team Payments</DialogTitle>
          <DialogDescription>
            You're about to process payments for {employeeCount} team members.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="border rounded-md p-4 flex justify-between items-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-semibold">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <Badge variant="outline" className="ml-4">
              {employeeCount} {employeeCount === 1 ? 'team member' : 'team members'}
            </Badge>
          </div>
          
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />          <AlertDescription>
            {isSupplementary 
              ? "This is a supplementary pay run for services that were added after earlier payments. Only unpaid services will be processed." 
              : "This action will mark all payments as processed. It cannot be undone."}
          </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payments
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
