import React, { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

interface ProcessPaymentsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (employeeIds?: string[]) => Promise<void>;
  totalAmount: number;
  employeeCount: number;
  isSupplementary?: boolean;
  selectedEmployeeIds?: string[];
  payRunId?: string; // Added payRunId to fetch accurate payment amounts
}

export function ProcessPaymentsDialog({
  open,
  onClose,
  onConfirm,
  totalAmount,
  employeeCount,
  isSupplementary = false,
  selectedEmployeeIds,
  payRunId,
}: ProcessPaymentsDialogProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actualTotalAmount, setActualTotalAmount] = useState<number>(totalAmount);
  
  // Format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }
  // Fetch the total amount specifically for selected employees
  useEffect(() => {
    async function fetchSelectedEmployeesTotal() {
      // Check if we're in a selected employees mode
      if (selectedEmployeeIds && selectedEmployeeIds.length > 0 && payRunId) {
        setIsLoading(true);
        try {
          console.log(`Calculating payment total for ${selectedEmployeeIds.length} selected employees in pay run ${payRunId}`);
          
          // Query the database for unpaid amounts for selected employees only
          const { data, error } = await supabase
            .from("pay_run_items")
            .select("amount, employee_id")
            .eq("pay_run_id", payRunId)
            .eq("is_paid", false)
            .in("employee_id", selectedEmployeeIds);
          
          if (error) {
            console.error("Error fetching selected employee payment data:", error);
            // Keep using the original total amount
            return;
          }
          
          if (!data || data.length === 0) {
            console.warn("No unpaid items found for selected employees");
            setActualTotalAmount(0);
          } else {
            // Calculate the sum of amounts for selected employees
            const selectedTotal = data.reduce((sum, item) => {
              // Handle amount being potentially a string or number
              const itemAmount = typeof item.amount === 'string' 
                ? parseFloat(item.amount)
                : (item.amount || 0);
              
              return sum + itemAmount;
            }, 0);
            
            console.log(`Calculated total for selected employees: ${selectedTotal}`);
            
            // Safeguard against negative or invalid amounts
            if (isNaN(selectedTotal) || selectedTotal < 0) {
              console.warn("Invalid total calculated:", selectedTotal);
              setActualTotalAmount(0);
            } else {
              setActualTotalAmount(selectedTotal);
            }
          }
        } catch (error) {
          console.error("Error calculating selected employees total:", error);
          // In case of error, fall back to the original total
          setActualTotalAmount(totalAmount);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If no specific employees selected or no pay run ID, use the original total
        console.log("Using original total amount:", totalAmount);
        setActualTotalAmount(totalAmount);
      }
    }
    
    fetchSelectedEmployeesTotal();
  }, [selectedEmployeeIds, payRunId, totalAmount]);
  
  // Handle confirm
  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm(selectedEmployeeIds);
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
          <div className="space-y-6">          <div className="border rounded-md p-4 flex justify-between items-center">            <div>
              <div className="text-sm text-muted-foreground">
                {selectedEmployeeIds && selectedEmployeeIds.length > 0 ? (
                  <span className="flex items-center">
                    Selected Total
                    <Badge variant="secondary" className="ml-1.5 text-xs">Filtered</Badge>
                  </span>
                ) : (
                  "Total Amount"
                )}
              </div>
              <div className="text-2xl font-semibold">
                {isLoading ? (
                  <span className="flex items-center">
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </span>
                ) : (
                  formatCurrency(actualTotalAmount)
                )}
              </div>
            </div>
            <Badge variant="outline" className="ml-4">
              {employeeCount} {employeeCount === 1 ? 'team member' : 'team members'}
            </Badge>
          </div>
          
          {/* Selected employee count info */}
          {selectedEmployeeIds && selectedEmployeeIds.length > 0 ? (
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Selected team members: {selectedEmployeeIds.length}</p>
              <p className="text-xs text-muted-foreground">
                You've selected specific team members to process payments for. Only these team members will be paid in this run.
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Processing all team members</p>
              <p className="text-xs text-muted-foreground">
                All team members with unpaid amounts will be processed in this payment run.
              </p>
            </div>
          )}
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
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
