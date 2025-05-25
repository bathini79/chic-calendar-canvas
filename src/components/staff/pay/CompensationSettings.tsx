import React, { useState ,useEffect} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { usePayroll } from "@/hooks/use-payroll";
import {
  CompensationFormData,
  CompensationHistoryEntry,
} from "@/types/payroll";
import { format } from "date-fns";
import { LoaderCircle, Plus, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompensationSettingsProps {
  employeeId: string;
  onCompensationChange?: (data: CompensationFormData) => void;
  readOnly?: boolean;
}

export function CompensationSettings({
  employeeId,
  onCompensationChange,
  readOnly = false,
}: CompensationSettingsProps) {
  const { toast } = useToast();
  const { useEmployeeCompensation, addEmployeeCompensation } = usePayroll();

  // Form state
  const [newSalary, setNewSalary] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<Date | null>(new Date());
  
  // Fetch employee's compensation history
  const { data: compensationHistory, isLoading } =
    useEmployeeCompensation(employeeId);

  // Current salary is the most recent entry
  const currentSalary =
    compensationHistory && compensationHistory.length > 0
      ? compensationHistory[0].base_amount
      : null;
      
  // Update parent component when salary or date changes  
  useEffect(() => {
    if (onCompensationChange && effectiveDate) {
      try {
        // Only trigger if we have a valid number
        const salaryValue = newSalary ? parseFloat(newSalary) : 0;
        
        if (!isNaN(salaryValue)) {
          onCompensationChange({
            monthly_salary: salaryValue, // Match the schema field name
            effective_from: effectiveDate,
          });
        }
      } catch (error) {
        console.error("Error updating compensation:", error);
      }
    }
  }, [newSalary, effectiveDate, onCompensationChange]);

  // Initialize salary and date from current compensation if available
  useEffect(() => {
    if (currentSalary !== null && compensationHistory && compensationHistory.length > 0) {
      setNewSalary(currentSalary.toString());
      setEffectiveDate(new Date(compensationHistory[0].effective_from));
    }
  }, [currentSalary, compensationHistory]);

  const validateCompensationData = (): CompensationFormData | null => {
    if (!newSalary || !effectiveDate) {
      toast({
        title: "Missing information",
        description: "Please enter both salary and effective date",
        variant: "destructive",
      });
      return null;
    }

    const salaryValue = parseFloat(newSalary);

    if (isNaN(salaryValue) || salaryValue <= 0) {
      toast({
        title: "Invalid salary",
        description: "Please enter a valid positive number for salary",
        variant: "destructive",
      });
      return null;
    }

    return {
      base_amount: salaryValue,
      effective_from: effectiveDate,
    };
  };

  // This is now a local validation function, not making the API call directly
  const handleAddSalary = async () => {
    // Only used when there's no parent handler (for backward compatibility)
    if (!onCompensationChange) {
      const data = validateCompensationData();
      if (!data) return;

      try {
        await addEmployeeCompensation.mutateAsync({
          employeeId,
          data,
        });

        toast({
          title: "Success",
          description: "Compensation settings updated",
        });
        // Reset form
        setNewSalary("");
        setEffectiveDate(new Date());
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to update compensation settings",
          variant: "destructive",
        });
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compensation</CardTitle>
        <CardDescription>
          Configure employee's salary and view compensation history
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : (
          <>
            {currentSalary !== null && (
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-500">
                  Current Monthly Salary
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentSalary)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Effective from:{" "}
                  {compensationHistory && compensationHistory.length > 0
                    ? format(
                        compensationHistory[0].effective_from,
                        "MMM dd, yyyy"
                      )
                    : ""}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Monthly Salary
                </label>
                <Input
                  type="number"
                  placeholder="Enter monthly salary"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Effective From
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !effectiveDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {effectiveDate ? (
                        format(effectiveDate, "PPP")
                      ) : (
                        <span>Select effective date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={effectiveDate}
                      onSelect={setEffectiveDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>              
              {/* Save button only shown when no parent handler and not in readOnly mode */}
              {!onCompensationChange && !readOnly && (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleAddSalary}
                    disabled={addEmployeeCompensation.isPending}
                  >
                    {addEmployeeCompensation.isPending && (
                      <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>
            {/* Compensation History */}
            {compensationHistory && compensationHistory.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-medium mb-2">
                  Compensation History
                </h4>
                <div className="space-y-3">
                  {compensationHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 border rounded-md flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {formatCurrency(entry.base_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          From: {format(entry.effective_from, "MMM dd, yyyy")}
                          {entry.effective_to && (
                            <> to: {format(entry.effective_to, "MMM dd, yyyy")}</>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(entry.created_at, "MMM dd, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
