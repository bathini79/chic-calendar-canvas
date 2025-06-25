import * as React from "react";
import { format, isSameDay, subDays, startOfDay } from "date-fns";
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

  // Format dates for input fields
  const formatInputDate = (date: Date | undefined) => {
    return date ? format(date, "yyyy-MM-dd") : "";
  };

  // Handle manual date input
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : undefined;
    if (newDate) {
      setTempDateRange({
        from: newDate,
        to: tempDateRange?.to,
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : undefined;
    if (newDate) {
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
    onChange(tempDateRange);
    setIsDialogOpen(false);
    setIsPopoverOpen(false);
  };

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
      return `${format(dateRange.from, "d MMM")} - ${format(dateRange.to, "d MMM yyyy")}`;
    }
    
    return format(dateRange.from, "d MMM yyyy");
  }, [dateRange]);

  // Common form inputs for both versions
  const DateInputs = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Starting</label>
        <Input
          type={isMobile ? "date" : "text"}
          value={tempDateRange?.from ? format(tempDateRange.from, "MMM dd, yyyy") : ""}
          onChange={handleStartDateChange}
          className="w-full"
          placeholder="YYYY-MM-DD"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Ending</label>
        <Input
          type={isMobile ? "date" : "text"}
          value={tempDateRange?.to ? format(tempDateRange.to, "MMM dd, yyyy") : ""}
          onChange={handleEndDateChange}
          className="w-full"
          placeholder="YYYY-MM-DD"
        />
      </div>
    </div>
  );

  // Preset selector for both versions
  const PresetSelector = () => (
    <div>
      <label className="text-sm font-medium mb-2 block">Date range</label>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a preset range" />
        </SelectTrigger>
        <SelectContent>
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
    return (
      <div className={`mt-2 ${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-8 justify-center'}`}>
        <div className={isMobile ? '' : 'flex justify-end'}>
          <Calendar
            mode="range"
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={isMobile ? 2 : 1}
            initialFocus
            defaultMonth={tempDateRange?.from}
            className="w-full border-0"
            showOutsideDays={false}
            weekStartsOn={6 as 0 | 1 | 2 | 3 | 4 | 5 | 6}
            classNames={{
              day: "h-10 w-10 p-0 font-normal hover:bg-muted/50",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-full",
              day_today: "bg-accent text-accent-foreground",
              day_range_middle: "rounded-none",
              head_cell: "text-muted-foreground font-normal text-sm",
              caption_label: "text-base font-medium",
              month: "space-y-4",
              nav_button: "h-8 w-8 hover:bg-muted rounded-full",
              head_row: "flex justify-between",
              cell: "text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
              months: "flex flex-col space-y-4"
            }}
          />
        </div>
        
        {/* Second calendar only needed for desktop view */}
        {!isMobile && (
          <div className="flex justify-start">
            <Calendar
              mode="range"
              selected={tempDateRange}
              onSelect={setTempDateRange}
              defaultMonth={tempDateRange?.to || (tempDateRange?.from ? new Date(tempDateRange.from.getFullYear(), tempDateRange.from.getMonth() + 1, 1) : undefined)}
              className="w-full border-0"
              showOutsideDays={false}
              weekStartsOn={6 as 0 | 1 | 2 | 3 | 4 | 5 | 6}
              classNames={{
                day: "h-10 w-10 p-0 font-normal hover:bg-muted/50",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-full",
                day_today: "bg-accent text-accent-foreground",
                day_range_middle: "rounded-none",
                head_cell: "text-muted-foreground font-normal text-sm",
                caption_label: "text-base font-medium",
                month: "space-y-4",
                nav_button: "h-8 w-8 hover:bg-muted rounded-full",
                head_row: "flex justify-between",
                cell: "text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                months: "flex flex-col space-y-4"
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Content for mobile dialog
  const mobileContent = (
    <div className="space-y-4 pb-20">
      <PresetSelector />
      <DateInputs />
      <CalendarSection />
      <div className="fixed bottom-0 left-0 right-0 bg-white py-3 px-4 pb-5 border-t shadow-lg">
        <Button onClick={handleApply} className="w-full h-12 text-base font-medium">Apply</Button>
      </div>
    </div>
  );

  // Content for desktop popover
  const desktopContent = (
    <div className="space-y-4">
      <PresetSelector />
      <DateInputs />
      <CalendarSection />
      <div className="flex justify-end mt-6">
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => {
            setIsDialogOpen(false);
            setIsPopoverOpen(false);
          }}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="font-medium">Apply</Button>
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
      className="h-8 text-xs"
    >
      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
      <span>{formattedDateRange}</span>
    </Button>
  );

  // Create desktop trigger button
  const desktopTriggerButton = (
    <Button
      id="date-range-picker-desktop"
      variant="outline"
      size="sm"
      className="h-9"
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {formattedDateRange}
    </Button>
  );

  return (
    <div className={cn("flex items-center", className)}>
      {isMobile ? (
        // Mobile - Dialog
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>{mobileTriggerButton}</DialogTrigger>
          <DialogContent className="!top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[95vw] max-w-none border shadow-xl rounded-t-2xl !rounded-b-none overflow-hidden flex flex-col h-[95vh] pt-0 px-0 pb-0">
            <DialogHeader className="px-4 pt-6 pb-3 flex justify-between items-center sticky top-0 bg-white z-10">
              <DialogTitle className="text-2xl font-semibold">Select Period</DialogTitle>
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 rounded-full absolute right-4 top-6 p-0" 
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="px-4 flex-1 overflow-y-auto pt-2 pb-24">
              {mobileContent}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        // Desktop - Popover
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>{desktopTriggerButton}</PopoverTrigger>
          <PopoverContent className="w-[720px] p-6" align="center" side="bottom" sideOffset={5}>
            {desktopContent}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
