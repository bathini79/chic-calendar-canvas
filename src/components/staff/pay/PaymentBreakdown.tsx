import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { usePayroll } from "@/hooks/use-payroll";
import { PayRunItem } from "@/types/payroll-db";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PaymentBreakdownProps {
  open: boolean;
  onClose: () => void;
  payRunId: string;
  employeeId: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export function PaymentBreakdown({
  open,
  onClose,
  payRunId,
  employeeId,
}: PaymentBreakdownProps) {
  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payRunItems, setPayRunItems] = useState<PayRunItem[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Hooks
  const { usePayRunDetails, deleteAdjustment } = usePayroll();
  
  // Fetch pay run details
  const { data: payRunDetails, isLoading: isLoadingPayRun } = usePayRunDetails(payRunId);
  
  // Load employee details and pay run items
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      try {
        // Fetch employee details
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select("id, full_name, email")
          .eq("id", employeeId)
          .single();
        
        if (employeeError) throw employeeError;
        
        setEmployee(employeeData);
      } catch (error) {
        console.error("Error fetching employee details:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (open) {
      fetchData();
    }
  }, [employeeId, open]);
  
  // Filter pay run items for this employee
  useEffect(() => {
    if (payRunDetails?.items) {
      const items = payRunDetails.items.filter(
        (item: PayRunItem) => item.employee_id === employeeId
      );
      setPayRunItems(items);
    }
  }, [payRunDetails, employeeId]);
  
  // Format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }
  
  // Get category total
  function getCategoryTotal(category: string) {
    return payRunItems
      .filter(item => item.compensation_type === category)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }
  
  // Handle delete item
  async function handleDeleteItem(itemId: string) {
    try {
      await deleteAdjustment.mutateAsync(itemId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting adjustment:", error);
    }
  }
  
  // Get total from all items
  const totalAmount = payRunItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  // Group items by category for summary view
  const categorySummary = [
    { name: "Salary", type: "salary", amount: getCategoryTotal("salary") },
    { name: "Commissions", type: "commission", amount: getCategoryTotal("commission") },
    { name: "Tips", type: "tips", amount: getCategoryTotal("tips") },
    { name: "Other", type: "other", amount: getCategoryTotal("other") }
  ];
  
  // Pay run period date range
  const periodDateRange = payRunDetails?.pay_period ? 
    `${format(new Date(payRunDetails.pay_period.start_date), 'MMM d')} - ${format(new Date(payRunDetails.pay_period.end_date), 'MMM d, yyyy')}` : 
    "";

  if (isLoading || isLoadingPayRun) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Payment Breakdown</DialogTitle>
        </DialogHeader>
        
        {employee && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-medium">{employee.full_name}</h2>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Period</div>
                <div className="text-sm font-medium">{periodDateRange}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {categorySummary.map(category => (
                category.amount !== 0 && (
                  <Card key={category.type}>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">{category.name}</div>
                      <div className="text-xl font-semibold">
                        {formatCurrency(category.amount)}
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
              
              <Card className="md:col-span-2 bg-gray-50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total Payment</div>
                  <div className="text-2xl font-semibold">
                    {formatCurrency(totalAmount)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="border rounded-md">
              <div className="px-4 py-3 bg-muted/40 flex justify-between text-sm font-medium">
                <div>Detail</div>
                <div>Amount</div>
              </div>
              <div className="divide-y">
                {payRunItems.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No payment items found
                  </div>
                ) : (
                  payRunItems.map(item => (
                    <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium capitalize">{item.compensation_type}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="font-medium">
                          {formatCurrency(item.amount)}
                        </div>
                        
                        {/* Only show delete button for manual adjustments */}
                        {item.source_type === 'manual' && (
                          <>
                            {showDeleteConfirm === item.id ? (
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={deleteAdjustment.isPending}
                                >
                                  {deleteAdjustment.isPending ? (
                                    <LoaderCircle className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Yes"
                                  )}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setShowDeleteConfirm(null)}
                                >
                                  No
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowDeleteConfirm(item.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
