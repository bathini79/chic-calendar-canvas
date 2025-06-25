import * as React from "react";
import { format, isSameDay, subDays, startOfDay, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover, 
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const predefinedRanges = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last7days" },
  { label: "Last 30 days", value: "last30days" },
  { label: "Last 90 days", value: "last90days" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
  { label: "This quarter", value: "thisQuarter" },
  { label: "Last quarter", value: "lastQuarter" },
  { label: "This year", value: "thisYear" },
  { label: "Last year", value: "lastYear" },
  { label: "All time", value: "allTime" },
  { label: "Last 6 months", value: "last6months" },
  { label: "Custom range", value: "custom" },
];

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onChange: (dateRange: DateRange | undefined) => void;
  className?: string;
  align?: "start" | "end" | "center";
  isMobile?: boolean;
}

export function DateRangePicker({
  dateRange,
  onChange,
  className,
  align = "start",
  isMobile = false
}: DateRangePickerProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange);
  
  // Format dates for display in input fields
  const formatInputDate = (date: Date | undefined) => {
    return date ? format(date, "d MMM yyyy") : "";
  };

  // Parse date from input field format
  const parseInputDate = (dateString: string) => {
    if (!dateString) return undefined;
    // Try to parse the date using the expected format
    const parsedDate = parse(dateString, "d MMM yyyy", new Date());
    return isValid(parsedDate) ? parsedDate : undefined;
  };

  // Handle manual date input
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setTempDateRange({
        from: undefined,
        to: tempDateRange?.to,
      });
      return;
    }

    let newDate;
    if (isMobile) {
      // Mobile uses native date input
      newDate = new Date(value);
    } else {
      // Desktop uses text input with our format
      newDate = parseInputDate(value);
    }

    if (newDate && isValid(newDate)) {
      setTempDateRange({
        from: newDate,
        to: tempDateRange?.to,
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setTempDateRange({
        from: tempDateRange?.from,
        to: undefined,
      });
      return;
    }

    let newDate;
    if (isMobile) {
      // Mobile uses native date input
      newDate = new Date(value);
    } else {
      // Desktop uses text input with our format
      newDate = parseInputDate(value);
    }

    if (newDate && isValid(newDate)) {
      setTempDateRange({
        from: tempDateRange?.from,
        to: newDate,
      });
    }
  };

  // Handle preset selection
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 6);
    
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 29);
    
    const last90DaysStart = new Date(today);
    last90DaysStart.setDate(last90DaysStart.getDate() - 89);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const thisQuarterStart = new Date(
      today.getFullYear(),
      Math.floor(today.getMonth() / 3) * 3,
      1
    );
    
    const lastQuarterStart = new Date(
      today.getFullYear(),
      Math.floor(today.getMonth() / 3) * 3 - 3,
      1
    );
    const lastQuarterEnd = new Date(
      today.getFullYear(),
      Math.floor(today.getMonth() / 3) * 3,
      0
    );
    
    const thisYearStart = new Date(today.getFullYear(), 0, 1);
    
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear(), 0, 0);
    
    const last6MonthsStart = new Date(today);
    last6MonthsStart.setMonth(today.getMonth() - 6);

    let newRange: DateRange | undefined;
    
    switch (value) {
      case "today":
        newRange = { from: today, to: today };
        break;
      case "yesterday":
        newRange = { from: yesterday, to: yesterday };
        break;
      case "last7days":
        newRange = { from: last7DaysStart, to: today };
        break;
      case "last30days":
        newRange = { from: last30DaysStart, to: today };
        break;
      case "last90days":
        newRange = { from: last90DaysStart, to: today };
        break;
      case "thisMonth":
        newRange = { from: thisMonthStart, to: today };
        break;
      case "lastMonth":
        newRange = { from: lastMonthStart, to: lastMonthEnd };
        break;
      case "thisQuarter":
        newRange = { from: thisQuarterStart, to: today };
        break;
      case "lastQuarter":
        newRange = { from: lastQuarterStart, to: lastQuarterEnd };
        break;
      case "thisYear":
        newRange = { from: thisYearStart, to: today };
        break;
      case "lastYear":
        newRange = { from: lastYearStart, to: lastYearEnd };
        break;
      case "allTime":
        newRange = { from: new Date(2020, 0, 1), to: today };
        break;
      case "last6months":
        newRange = { from: last6MonthsStart, to: today };
        break;
      case "custom":
        return;
      default:
        return;
    }
    
    setTempDateRange(newRange);
  };
  
  // Apply the selected date range
  const handleApply = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      // Ensure from date is earlier than to date
      if (tempDateRange.from > tempDateRange.to) {
        // Swap dates if they're in the wrong order
        onChange({
          from: tempDateRange.to,
          to: tempDateRange.from,
        });
      } else {
        onChange(tempDateRange);
      }
    } else {
      // Handle single date selection
      if (tempDateRange?.from) {
        onChange({
          from: tempDateRange.from,
          to: tempDateRange.from,
        });
      }
    }
    setIsDialogOpen(false);
    setIsPopoverOpen(false);
  };

  // Reset temp date range when dialog/popover opens
  React.useEffect(() => {
    if (isDialogOpen || isPopoverOpen) {
      setTempDateRange(dateRange);
      // Reset selected preset if opening the picker
      if (!dateRange?.from || !dateRange?.to) {
        setSelectedPreset(undefined);
      }
    }
  }, [isDialogOpen, isPopoverOpen, dateRange]);
  
  // Format displayed date range
  const formattedDateRange = React.useMemo(() => {
    if (!dateRange?.from) {
      return "Select date range";
    }

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = subDays(today, 1);
    
    // For today only
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today)) {
      return "Today";
    }
    
    // For yesterday only
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, yesterday) && isSameDay(dateRange.to, yesterday)) {
      return "Yesterday";
    }
    
    // For last 7 days
    const last7Days = subDays(today, 6);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, last7Days) && isSameDay(dateRange.to, today)) {
      return "Last 7 days";
    }
    
    // For last 30 days
    const last30Days = subDays(today, 29);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, last30Days) && isSameDay(dateRange.to, today)) {
      return "Last 30 days";
    }

    // Default format for date range
    if (dateRange.to) {
      // If both dates are in same year
      if (dateRange.from.getFullYear() === dateRange.to.getFullYear()) {
        // If both dates are in the same month
        if (dateRange.from.getMonth() === dateRange.to.getMonth()) {
          return `${format(dateRange.from, "d")} - ${format(dateRange.to, "d MMM yyyy")}`;
        } else {
          return `${format(dateRange.from, "d MMM")} - ${format(dateRange.to, "d MMM yyyy")}`;
        }
      } else {
        return `${format(dateRange.from, "d MMM yyyy")} - ${format(dateRange.to, "d MMM yyyy")}`;
      }
    }
    
    return format(dateRange.from, "d MMM yyyy");
  }, [dateRange]);
  
  // Common form inputs for both versions
  const DateInputs = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block text-muted-foreground">Start Date</label>
        <Input
          type={isMobile ? "date" : "text"}
          value={isMobile 
            ? (tempDateRange?.from ? format(tempDateRange.from, "yyyy-MM-dd") : "") 
            : (tempDateRange?.from ? format(tempDateRange.from, "d MMM yyyy") : "")
          }
          onChange={handleStartDateChange}
          className="w-full focus:border-primary/50 rounded-md border-muted/30 bg-[#FAFAFA]"
          placeholder={isMobile ? "" : "Select date"}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-muted-foreground">End Date</label>
        <Input
          type={isMobile ? "date" : "text"}
          value={isMobile 
            ? (tempDateRange?.to ? format(tempDateRange.to, "yyyy-MM-dd") : "") 
            : (tempDateRange?.to ? format(tempDateRange.to, "d MMM yyyy") : "")
          }
          onChange={handleEndDateChange}
          className="w-full focus:border-primary/50 rounded-md border-muted/30 bg-[#FAFAFA]"
          placeholder={isMobile ? "" : "Select date"}
        />
      </div>
    </div>
  );
  
  // Preset selector for both versions
  const PresetSelector = () => (
    <div>
      <label className="text-sm font-medium mb-2 block text-muted-foreground">Preset Range</label>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full border-muted/30 focus:ring-primary/20 rounded-md bg-[#FAFAFA]">
          <SelectValue placeholder="Select a preset range" />
        </SelectTrigger>
        <SelectContent className="border-muted/30 rounded-md">
          {predefinedRanges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  
  // Calendar component with proper layout for mobile and desktop
  const CalendarSection = () => {
    // Common calendar class names for consistent styling
    const calendarClassNames = {
      day: "h-10 w-10 p-0 font-normal hover:bg-[#F0F6FF] relative flex items-center justify-center",
      day_selected: "bg-[#4E82FD] text-white hover:bg-[#4E82FD] hover:text-white rounded-full",
      day_today: "border border-[#4E82FD]/50 text-foreground font-medium",
      day_range_middle: "bg-[#EDF2FE] text-foreground rounded-none",
      head_cell: "text-muted-foreground font-normal text-sm px-0 py-2",
      caption_label: "text-base font-medium",
      month: "space-y-4",
      nav_button: "h-8 w-8 hover:bg-[#F0F6FF] rounded-full flex items-center justify-center bg-background hover:bg-[#F0F6FF]",
      head_row: "grid grid-cols-7 mb-2",
      row: "grid grid-cols-7 mt-1",
      cell: "text-center p-0 relative [&:has([aria-selected])]:bg-[#EDF2FE]/50 first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full focus-within:relative focus-within:z-20",
      months: isMobile ? "flex flex-col space-y-4" : "flex flex-row space-x-8",
      table: "w-full border-collapse",
      caption: "flex justify-center pt-2 pb-4 relative items-center px-6",
      nav_button_previous: "absolute left-2",
      nav_button_next: "absolute right-2"
    };

    return (
      <div className={`mt-6 ${isMobile ? 'space-y-6' : 'grid grid-cols-2 gap-8 justify-center'}`}>
        {/* First calendar */}
        <div className={isMobile ? '' : 'flex justify-end'}>
          <Calendar
            mode="range"
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={isMobile ? 1 : 1}
            initialFocus
            defaultMonth={tempDateRange?.from || new Date()}
            className="w-full border-0 bg-background rounded-lg p-2"
            showOutsideDays={false}
            weekStartsOn={0}
            classNames={calendarClassNames}
            formatters={{
              formatWeekdayName: (day) => {
                const date = new Date(2023, 0, day + 1);
                return format(date, 'EEE');
              }
            }}
          />
        </div>
        
        {/* Second calendar - mobile shows second calendar below first one */}
        {/* Optional: show or hide second calendar based on screen space */}
        <div className={isMobile ? '' : 'flex justify-start'}>
          <Calendar
            mode="range"
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={1}
            defaultMonth={isMobile 
              ? (tempDateRange?.from ? new Date(tempDateRange.from.getFullYear(), tempDateRange.from.getMonth() + 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
              : (tempDateRange?.to || (tempDateRange?.from ? new Date(tempDateRange.from.getFullYear(), tempDateRange.from.getMonth() + 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)))
            }
            className="w-full border-0 bg-background rounded-lg p-2"
            showOutsideDays={false}
            weekStartsOn={0}
            classNames={calendarClassNames}
            formatters={{
              formatWeekdayName: (day) => {
                const date = new Date(2023, 0, day + 1);
                return format(date, 'EEE');
              }
            }}
          />
        </div>
      </div>
    );
  };
  
  // Content for mobile dialog
  const mobileContent = (
    <div className="space-y-6 pb-20">
      <PresetSelector />
      <DateInputs />
      <CalendarSection />
      <div className="fixed bottom-0 left-0 right-0 bg-white py-4 px-4 pb-8 border-t shadow-lg">
        <Button 
          onClick={handleApply} 
          className="w-full h-12 text-base font-medium bg-[#4E82FD] hover:bg-[#4E82FD]/90 rounded-lg transition-colors text-white"
        >
          Apply
        </Button>
      </div>
    </div>
  );

  // Content for desktop popover
  const desktopContent = (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <PresetSelector />
        <Button 
          variant="ghost" 
          className="p-2 h-9 rounded-full" 
          onClick={() => {
            setIsPopoverOpen(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <DateInputs />
      <CalendarSection />
      <div className="flex justify-end mt-6">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setTempDateRange(dateRange);
              setIsPopoverOpen(false);
            }}
            className="border-muted/30 hover:bg-muted/20 rounded-lg px-5"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            className="font-medium bg-[#4E82FD] hover:bg-[#4E82FD]/90 rounded-lg px-5 text-white"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
  
  // Create mobile trigger button
  const mobileTriggerButton = (
    <Button
      id="date-range-picker-mobile" 
      variant="outline"
      size="sm"
      className="h-8 text-xs border-muted/30 hover:bg-muted/10 rounded-md transition-colors"
    >
      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-[#4E82FD]" />
      <span className="truncate max-w-[150px]">{formattedDateRange}</span>
    </Button>
  );

  // Create desktop trigger button
  const desktopTriggerButton = (
    <Button
      id="date-range-picker-desktop"
      variant="outline"
      size="sm"
      className="h-9 border-muted/30 hover:bg-muted/10 rounded-md transition-colors"
    >
      <CalendarIcon className="mr-2 h-4 w-4 text-[#4E82FD]" />
      {formattedDateRange}
    </Button>
  );

  return (
    <div className={cn("flex items-center", className)}>
      {isMobile ? (
        // Mobile - Dialog
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open) {
            // Reset temp date range to current date range when opening
            setTempDateRange(dateRange);
          }
        }}>
          <DialogTrigger asChild>{mobileTriggerButton}</DialogTrigger>
          <DialogContent className="!top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[100vw] max-w-none border shadow-xl rounded-t-2xl !rounded-b-none overflow-hidden flex flex-col h-[90vh] pt-0 px-0 pb-0">
            <DialogHeader className="px-4 pt-6 pb-3 flex justify-between items-center sticky top-0 bg-white z-10 border-b">
              <DialogTitle className="text-lg font-semibold">Select Period</DialogTitle>
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 rounded-full absolute right-4 top-5 p-0" 
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="px-4 flex-1 overflow-y-auto pt-4 pb-24">
              {mobileContent}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        // Desktop - Popover
        <Popover open={isPopoverOpen} onOpenChange={(open) => {
          setIsPopoverOpen(open);
          if (open) {
            // Reset temp date range to current date range when opening
            setTempDateRange(dateRange);
          }
        }}>
          <PopoverTrigger asChild>{desktopTriggerButton}</PopoverTrigger>
          <PopoverContent 
            className="w-[720px] p-6 shadow-lg border border-muted/30 rounded-lg" 
            align={align} 
            side="bottom" 
            sideOffset={5}
          >
            <div className="mb-4 pb-2 border-b">
              <h2 className="text-lg font-semibold">Select Period</h2>
            </div>
            {desktopContent}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
