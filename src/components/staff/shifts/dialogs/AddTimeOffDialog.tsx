import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SelectItemProps } from "@radix-ui/react-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface AddTimeOffDialogProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  selectedEmployee?: any;
  employees: any[];
  selectedLocation?: string;
  existingTimeOff?: {
    start_date: string;
    end_date: string;
    reason: string;
    id: string;
  };
}

export function AddTimeOffDialog({
  isOpen,
  onClose,
  selectedEmployee,
  employees,
  selectedLocation = "",
  existingTimeOff,
}: AddTimeOffDialogProps) {
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id || "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    existingTimeOff ? new Date(existingTimeOff.start_date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    existingTimeOff ? new Date(existingTimeOff.end_date) : new Date()
  );  const [reason, setReason] = useState<string>(
    existingTimeOff?.reason || "Vacation"
  );
  const [reasonText, setReasonText] = useState<string>(
    existingTimeOff?.reason || "Vacation"
  );
  const [approved, setApproved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [leaveType, setLeaveType] = useState<"paid" | "unpaid">("paid"); // Default to paid leave

  // Type for status to match database enum
  type TimeOffRequestStatus = "pending" | "approved" | "declined";

  const { toast } = useToast();

  const reasonOptions: { label: string; value: string }[] = [
    { label: "Vacation", value: "Vacation" },
    { label: "Sick Leave", value: "Sick Leave" },
    { label: "Personal Day", value: "Personal Day" },
    { label: "Other", value: "Other" },
  ];

  const leaveTypeOptions: { label: string; value: "paid" | "unpaid" }[] = [
    { label: "Paid", value: "paid" },
    { label: "Unpaid", value: "unpaid" },
  ];

  // Update form if existingTimeOff changes
  useEffect(() => {
    if (existingTimeOff) {
      setStartDate(new Date(existingTimeOff.start_date));
      setEndDate(new Date(existingTimeOff.end_date));
      setReason(existingTimeOff.reason);
    }
  }, [existingTimeOff]);

  useEffect(() => {
    if (reason !== "Other") {
      setReasonText(reason);
    }
  }, [reason]);

  const showReasonInput = reason === "Other";

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate inputs
      if (!employeeId) {
        toast({
          title: "Error",
          description: "Please select an employee",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      if (!startDate || !endDate) {
        toast({
          title: "Error",
          description: "Please select start and end dates",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      if (endDate < startDate) {
        toast({
          title: "Error",
          description: "End date must be after start date",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      const timeOffData = {
        employee_id: employeeId,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        reason: reason || "Time Off",
        status: (approved ? "approved" : "pending") as TimeOffRequestStatus,
        location_id: selectedLocation || null,
        leave_type: leaveType, // Add leave type to the form data
      };

      if (existingTimeOff) {
        // Update existing time off request
        const { error } = await supabase
          .from("time_off_requests")
          .update(timeOffData)
          .eq("id", existingTimeOff.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Time off request has been updated",
        });
      } else {
        // Create new time off request
        const { error } = await supabase
          .from("time_off_requests")
          .insert(timeOffData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Time off request has been submitted",
        });
      }

      onClose(true); // Pass true to indicate data was changed
    } catch (error) {
      console.error("Error saving time off request:", error);
      toast({
        title: "Error",
        description: "Failed to save time off request",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingTimeOff
              ? `Edit time off request for ${selectedEmployee?.name}`
              : `Add time off request for ${selectedEmployee?.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6"> 
          <div className="space-y-2">
            <Label>Reason</Label>
            <div className="flex items-center space-x-4">
              <Select
                onValueChange={(value) => {
                  setReason(value);
                  setReasonText(value);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showReasonInput && (
                <Input
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Enter reason"
                  className="w-full"
                />
              )}
            </div>
          </div>{" "}
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <div className="flex items-center space-x-4">
              <Select
                defaultValue="paid"
                onValueChange={(value) =>
                  setLeaveType(value as "paid" | "unpaid")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="approved"
              checked={approved}
              onCheckedChange={(checked) => setApproved(checked === true)}
            />
            <label
              htmlFor="approved"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Approved
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : existingTimeOff ? "Update" : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
