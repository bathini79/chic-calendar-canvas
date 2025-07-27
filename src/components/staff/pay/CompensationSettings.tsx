import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";

type CompensationSetting = Database['public']['Tables']['employee_compensation_settings']['Row'];
type CompensationSettingInsert = Database['public']['Tables']['employee_compensation_settings']['Insert'];

interface CompensationSettingsProps {
  employeeId?: string;
  onCompensationChange?: (data: CompensationSettingInsert) => void;
  readOnly?: boolean;
}

export function CompensationSettings({
  employeeId,
  onCompensationChange,
  readOnly = false,
}: CompensationSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [monthlySalary, setMonthlySalary] = useState<string>("");
  const [workingDays, setWorkingDays] = useState<string>("26");
  const [workingHours, setWorkingHours] = useState<string>("9");
  const [effectiveDate, setEffectiveDate] = useState<Date>();

  // Fetch compensation history
  const { data: compensationHistory = [] } = useQuery<CompensationSetting[]>({
    queryKey: ['compensation-history', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_compensation_settings')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false });

      if (error) {
        console.error('Error fetching compensation history:', error);
        throw error;
      }

      return data;
    },
    enabled: !!employeeId
  });

  // Initialize form with current compensation if available
  useState(() => {
    if (compensationHistory.length > 0) {
      const current = compensationHistory[0];
      setMonthlySalary(current.base_amount.toString());
      setWorkingDays(current.working_days.toString());
      setWorkingHours(current.working_hours.toString());
      setEffectiveDate(new Date(current.effective_from));
    }
  }, [compensationHistory]);

  const calculateHourlyRate = (salary: number, days: number, hours: number): string => {
    if (isNaN(salary) || isNaN(days) || isNaN(hours) || !days || !hours) return "0";
    return (salary / (days * hours)).toFixed(2);
  };

  const hourlyRate = useMemo(() => {
    return calculateHourlyRate(
      parseFloat(monthlySalary),
      parseFloat(workingDays),
      parseFloat(workingHours)
    );
  }, [monthlySalary, workingDays, workingHours]);

  // Add/Update mutation
  const addEmployeeCompensation = useMutation({
    mutationFn: async (data: CompensationSettingInsert) => {
      if (!employeeId) throw new Error("Employee ID is required");

      // If there's existing compensation, set effective_to on the current record
      if (compensationHistory.length > 0) {
        const currentRecord = compensationHistory[0];
        const { error: updateError } = await supabase
          .from('employee_compensation_settings')
          .update({ effective_to: new Date().toISOString() })
          .eq('id', currentRecord.id);

        if (updateError) throw updateError;
      }

      // Insert new compensation record
      const { data: newRecord, error: insertError } = await supabase
        .from('employee_compensation_settings')
        .insert({
          employee_id: employeeId,
          base_amount: data.base_amount,
          working_days: data.working_days,
          working_hours: data.working_hours,
          hourly_rate: data.hourly_rate,
          effective_from: data.effective_from,
          effective_to: null
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['compensation-history', employeeId]);
      toast({
        title: "Success",
        description: "Compensation settings updated successfully",
      });

      // Reset form if not controlled by parent
      if (!onCompensationChange) {
        setMonthlySalary("");
        setWorkingDays("26");
        setWorkingHours("9");
        setEffectiveDate(undefined);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update compensation settings",
        variant: "destructive",
      });
    }
  });

  const handleAddSalary = async () => {
    // Validate inputs
    if (!monthlySalary || !effectiveDate) {
      toast({
        title: "Missing Information",
        description: "Please enter salary and effective date",
        variant: "destructive",
      });
      return;
    }

    const salary = parseFloat(monthlySalary);
    const days = parseFloat(workingDays);
    const hours = parseFloat(workingHours);

    if (isNaN(salary) || salary <= 0) {
      toast({
        title: "Invalid Salary",
        description: "Please enter a valid salary amount",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(days) || days < 1 || days > 31) {
      toast({
        title: "Invalid Working Days",
        description: "Working days must be between 1 and 31",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(hours) || hours < 1 || hours > 24) {
      toast({
        title: "Invalid Working Hours",
        description: "Working hours must be between 1 and 24",
        variant: "destructive",
      });
      return;
    }

    const data: CompensationSettingInsert = {
      employee_id: employeeId!,
      base_amount: salary,
      working_days: days,
      working_hours: hours,
      hourly_rate: parseFloat(hourlyRate),
      effective_from: effectiveDate.toISOString()
    };

    if (onCompensationChange) {
      onCompensationChange(data);
    } else {
      await addEmployeeCompensation.mutateAsync(data);
    }
  };

  return (
    <div className="flex flex-col w-full px-4 pt-6 pb-20 md:px-32 md:pr-8">
      {/* Main Form Card */}
      <div className="w-full bg-white p-4 rounded-xl shadow-sm md:border md:rounded-lg md:p-6 md:max-w-2xl">
        <h3 className="text-lg font-medium mb-4 md:text-xl md:mb-6">
          Compensation Settings
        </h3>

        <div className="flex flex-col gap-4 md:gap-6">
          {/* Monthly Salary */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium md:text-base">
              Monthly Salary
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">
                ₹
              </span>
              <Input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className="pl-7 h-12 text-base md:h-10"
                placeholder="Enter monthly salary"
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Working Days and Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium md:text-base">
                Working Days per Month
              </Label>
              <Input
                type="number"
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                className="h-12 text-base md:h-10"
                placeholder="Working days"
                min="1"
                max="31"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium md:text-base">
                Working Hours per Day
              </Label>
              <Input
                type="number"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="h-12 text-base md:h-10"
                placeholder="Working hours"
                min="1"
                max="24"
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Hourly Rate Display */}
          {monthlySalary && workingDays && workingHours && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 md:text-base">
                    Hourly Rate:
                  </span>
                  <span className="text-base font-medium md:text-lg">
                    ₹{hourlyRate}/hr
                  </span>
                </div>
                <p className="text-xs text-gray-500 md:text-sm">
                  Based on {workingHours} hours/day, {workingDays} days/month
                </p>
              </div>
            </div>
          )}

          {/* Effective Date Picker */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium md:text-base">
              Effective From
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !effectiveDate && "text-muted-foreground",
                    "h-12 text-sm md:h-10"
                  )}
                  disabled={readOnly}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {effectiveDate ? format(effectiveDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={setEffectiveDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Compensation History */}
      {compensationHistory.length > 0 && (
        <div className="w-full bg-white mt-6 p-4 rounded-xl shadow-sm md:border md:rounded-lg md:p-6 md:max-w-2xl">
          <h3 className="text-lg font-medium mb-4 md:text-xl md:mb-6">
            Compensation History
          </h3>
          <div className="flex flex-col gap-4">
            {compensationHistory.map((record) => (
              <div key={record.id} className="border rounded-lg p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium md:text-lg">
                        ₹{record.base_amount}/month
                      </span>
                      <span className="text-sm text-gray-500 md:text-base">
                        (₹{calculateHourlyRate(
                          record.base_amount,
                          record.working_days,
                          record.working_hours
                        )}/hr)
                      </span>
                    </div>
                    <Badge variant={record.effective_to ? "secondary" : "default"}>
                      {record.effective_to ? "Previous" : "Current"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 md:text-sm">
                    From {format(new Date(record.effective_from), "PPP")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {!onCompensationChange && !readOnly && (
        <div className="mt-6 w-full md:max-w-2xl">
          <Button
            onClick={handleAddSalary}
            disabled={addEmployeeCompensation.isPending}
            className="w-full h-12 text-base md:w-auto md:h-10"
          >
            {addEmployeeCompensation.isPending && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
