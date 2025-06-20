import * as React from "react";
import { format, isSameDay, subDays, startOfDay, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import "./date-range-picker.css";
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

/**
 * Enhanced DateRangePicker Component - Fully self-contained and reusable
 * 
 * This component includes all necessary CSS styling, positioning logic, and 
 * responsive behavior. It can be used anywhere without additional setup.
 * 
 * @example
 * // Basic usage
 * <DateRangePicker
 *   dateRange={dateRange}
 *   onChange={setDateRange}
 *   isMobile={isMobile}
 * />
 * 
 * @example
 * // Advanced usage with custom positioning and sizing
 * <DateRangePicker
 *   dateRange={dateRange}
 *   onChange={setDateRange}
 *   isMobile={isMobile}
 *   useDialogOnDesktop={true}
 *   dialogWidth="w-[500px] max-w-[90vw]"
 *   popoverWidth="w-[650px]"
 *   align="center"
 *   compact={true}
 * />
 */

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
  useDialogOnDesktop?: boolean; // Force dialog on desktop instead of popover
  dialogWidth?: string; // Custom dialog width (e.g., "600px", "sm:max-w-lg")
  popoverWidth?: string; // Custom popover width (e.g., "740px")
  compact?: boolean; // Use compact styling
}

export function DateRangePicker({
  dateRange,
  onChange,
  className,
  align = "start",
  isMobile = false,
  useDialogOnDesktop = false,
  dialogWidth = "w-[600px] max-w-[90vw]",
  popoverWidth = "w-[740px]",
  compact = false
}: DateRangePickerProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange);
    // Format dates for display in input fields - consistent formatting
  const formatInputDate = (date: Date | undefined) => {
    if (!date) return "";
    // Ensure we always use the same format for better UX
    try {
      return format(date, "d MMM yyyy");
    } catch (error) {
      // Fallback in case of invalid date
      return "";
    }
  };

  // Parse date from input field format with better error handling
  const parseInputDate = (dateString: string) => {
    if (!dateString) return undefined;
    
    try {
      // Try to parse the date using the expected format
      const parsedDate = parse(dateString, "d MMM yyyy", new Date());
      
      // Validate the parsed date is reasonable
      if (isValid(parsedDate) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
        return parsedDate;
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
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
  }, [isDialogOpen, isPopoverOpen, dateRange]);    // Helper function to consistently format dates
  const formatDate = (date: Date): string => {
    return format(date, "d MMM yyyy");
  };    // Format displayed date range
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
    
    // For last 90 days
    const last90Days = subDays(today, 89);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, last90Days) && isSameDay(dateRange.to, today)) {
      return "Last 90 days";
    }
    
    // For this month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, thisMonthStart) && isSameDay(dateRange.to, today)) {
      return "This month";
    }
    
    // For last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, lastMonthStart) && isSameDay(dateRange.to, lastMonthEnd)) {
      return "Last month";
    }
    
    // For this quarter
    const thisQuarterStart = new Date(
      today.getFullYear(),
      Math.floor(today.getMonth() / 3) * 3,
      1
    );
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, thisQuarterStart) && isSameDay(dateRange.to, today)) {
      return "This quarter";
    }
    
    // For last quarter
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
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, lastQuarterStart) && isSameDay(dateRange.to, lastQuarterEnd)) {
      return "Last quarter";
    }
    
    // For this year
    const thisYearStart = new Date(today.getFullYear(), 0, 1);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, thisYearStart) && isSameDay(dateRange.to, today)) {
      return "This year";
    }
    
    // For last year
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear(), 0, 0);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, lastYearStart) && isSameDay(dateRange.to, lastYearEnd)) {
      return "Last year";
    }
    
    // For last 6 months
    const last6MonthsStart = new Date(today);
    last6MonthsStart.setMonth(today.getMonth() - 6);
    if (dateRange.from && dateRange.to && 
        isSameDay(dateRange.from, last6MonthsStart) && isSameDay(dateRange.to, today)) {
      return "Last 6 months";
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
        return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
      }
    }
    
    return formatDate(dateRange.from);  }, [dateRange]);
  
  // Common form inputs for both versions
  const DateInputs = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block text-muted-foreground">Start Date</label>
        <Input
          type={isMobile ? "date" : "text"}
          value={isMobile 
            ? (tempDateRange?.from ? format(tempDateRange.from, "yyyy-MM-dd") : "") 
            : formatInputDate(tempDateRange?.from)
          }
          onChange={handleStartDateChange}
          className="w-full focus:border-primary/50 focus:ring-1 focus:ring-gray-300/20 rounded-md border-muted/30 bg-[#FAFAFA]"
          placeholder={isMobile ? "" : "1 Jan 2023"}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-muted-foreground">End Date</label>
        <Input
          type={isMobile ? "date" : "text"}
          value={isMobile 
            ? (tempDateRange?.to ? format(tempDateRange.to, "yyyy-MM-dd") : "") 
            : formatInputDate(tempDateRange?.to)
          }
          onChange={handleEndDateChange}
          className="w-full focus:border-primary/50 focus:ring-1 focus:ring-gray-300/20 rounded-md border-muted/30 bg-[#FAFAFA]"
          placeholder={isMobile ? "" : "31 Dec 2023"}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
  
  // Preset selector for both versions
  const PresetSelector = () => (
    <div>
      <label className="text-sm font-medium mb-2 block text-muted-foreground">Preset Range</label>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>      <SelectTrigger className="w-full border-muted/30 focus:ring-1 focus:ring-gray-300/20 focus:border-gray-400/40 rounded-md bg-[#FAFAFA] h-10">
          <SelectValue placeholder="Select a preset range" />
        </SelectTrigger>
        <SelectContent className="border-muted/30 rounded-md shadow-md">
          <div className="max-h-[250px] overflow-y-auto pr-1">
            {predefinedRanges.map((range) => (
              <SelectItem 
                key={range.value} 
                value={range.value}
                className="focus:bg-gray-100 focus:text-black cursor-pointer"
              >
                {range.label}
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
  // Formatter function for weekday names
  const formatWeekdayName = (weekday: Date) => {
    try {
      // Using only one 'E' gives us the first letter (S, M, T, W, T, F, S)
      // Using 'EEE' gives us the short name (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
      return format(weekday, 'EEE').substring(0, 2);
    } catch (error) {
      // Fallback in case of any errors
      const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      return days[weekday.getDay()];
    }
  };  // Calendar component with proper layout for mobile and desktop
  const CalendarSection = () => {    // Common calendar class names for consistent styling with black and light grey colors
    const calendarClassNames = {      day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 relative flex items-center justify-center transition-colors !text-black [&.day_selected]:!text-white [&.day_range_end]:!text-white [&.day_range_start]:!text-white",      
      day_selected: "bg-black text-white hover:bg-black hover:text-white rounded-full shadow-sm !text-white rdp-day_selected",
      day_today: "border border-gray-300 text-black font-medium",
      day_range_middle: "bg-transparent !text-black rounded-none hover:bg-gray-100 rdp-day_range_middle mx-0 w-full h-full",
      day_range_end: "bg-black text-white rounded-full !text-white rdp-day_selected",
      day_range_start: "bg-black text-white rounded-full !text-white rdp-day_selected",
      day_outside: "text-muted-foreground opacity-50",
      head_cell: "text-muted-foreground font-normal text-xs uppercase px-0 py-2 text-center w-9",
      caption_label: "text-sm font-medium text-black",
      month: "space-y-3",
      nav_button: "h-8 w-8 bg-[#f8f8fb] hover:bg-gray-100 rounded-full flex items-center justify-center border border-muted/30 shadow-sm text-muted-foreground hover:text-black transition-colors z-10",
      head_row: "grid grid-cols-7 mb-2",
      row: "grid grid-cols-7 mt-0 gap-0 w-full",
      cell: "h-9 w-9 text-center p-0 relative [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected.day-range-start])]:rounded-l-full last:[&:has([aria-selected.day-range-end])]:rounded-r-full focus-within:relative focus-within:z-10 text-black [&:has([aria-selected])]:text-black border-0 m-0 [&:has([aria-selected])]:overflow-hidden flex items-center justify-center",
      months: isMobile ? "flex flex-col space-y-4" : "flex flex-row space-x-6",
      table: "w-full border-collapse text-black border-spacing-0",
      caption: "flex justify-center pt-1 pb-3 relative items-center",
      nav_button_previous: "absolute left-1",
      nav_button_next: "absolute right-1"
    };

    return (
      <div className={`mt-4 ${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
        {/* First calendar */}
        <div className="relative flex justify-center">          <Calendar
            mode="range"
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={1}
            initialFocus
            defaultMonth={tempDateRange?.from || new Date()}
            className="w-full border-0 bg-[#f8f8fb] rounded-lg p-3"
            showOutsideDays={true}
            weekStartsOn={0}
            classNames={calendarClassNames}
            formatters={{
              formatWeekdayName: formatWeekdayName
            }}
          />
        </div>
        
        {/* Second calendar */}
        <div className="relative flex justify-center">          <Calendar
            mode="range"
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={1}
            defaultMonth={tempDateRange?.from 
              ? new Date(tempDateRange.from.getFullYear(), tempDateRange.from.getMonth() + 1, 1) 
              : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            }
            className="w-full border-0 bg-[#f8f8fb] rounded-lg p-3"
            showOutsideDays={true}
            weekStartsOn={0}
            classNames={calendarClassNames}
            formatters={{
              formatWeekdayName: formatWeekdayName
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
      <div className="fixed bottom-0 left-0 right-0 bg-[#f8f8fb] py-4 px-4 pb-8 border-t shadow-lg z-20">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              setTempDateRange(dateRange);
              setIsDialogOpen(false);
            }} 
            className="w-1/3 h-12 text-base font-medium border-muted/40 rounded-lg transition-colors"
          >
            Cancel
          </Button>          <Button 
            onClick={handleApply} 
            className="w-2/3 h-12 text-base font-medium bg-black hover:bg-black/90 rounded-lg transition-colors text-white shadow-sm"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
  // Content for desktop popover (original)
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
            className="font-medium bg-black hover:bg-black/90 rounded-lg px-5 text-white"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  // Content for desktop dialog (simplified)
  const desktopDialogContent = (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div>
        <label className="text-sm font-medium mb-2 block text-muted-foreground">Date range</label>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full border-black/30 focus:ring-1 focus:ring-gray-300/20 focus:border-black-400/40 rounded-md bg-[#FAFAFA] h-10">
            <SelectValue placeholder="Select a preset range" />
          </SelectTrigger>
          <SelectContent className="border-muted/30 rounded-md shadow-md">
            <div className="max-h-[250px] overflow-y-auto pr-1">
              {predefinedRanges.map((range) => (
                <SelectItem 
                  key={range.value} 
                  value={range.value}
                  className="focus:bg-gray-100 focus:text-black cursor-pointer"
                >
                  {range.label}
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Date Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">Starting</label>
          <Input
            type="date"
            value={tempDateRange?.from ? format(tempDateRange.from, "yyyy-MM-dd") : ""}
            onChange={handleStartDateChange}
            className="w-full focus:border-primary/50 focus:ring-1 focus:ring-gray-300/20 rounded-md border-black/30 bg-[#FAFAFA]"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">Ending</label>
          <Input
            type="date"
            value={tempDateRange?.to ? format(tempDateRange.to, "yyyy-MM-dd") : ""}
            onChange={handleEndDateChange}
            className="w-full focus:border-primary/50 focus:ring-1 focus:ring-gray-300/20 rounded-md border-black/30 bg-[#FAFAFA]"
          />
        </div>
      </div>

      {/* Calendar */}
      <CalendarSection />      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setTempDateRange(dateRange);
            setIsDialogOpen(false);
          }}
          className="border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-6 py-2"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleApply} 
          className="bg-black hover:bg-black/90 text-white border border-black rounded-lg px-6 py-2"
        >
          Apply
        </Button>
      </div>
    </div>
  );  // Create mobile trigger button
  const mobileTriggerButton = (
    <Button
      id="date-range-picker-mobile" 
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs hover:bg-muted/10 rounded-md transition-colors date-range-picker-trigger", className)}
    >
      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-black" />
      <span className="truncate max-w-[150px]">{formattedDateRange}</span>
    </Button>
  );

  // Create desktop trigger button
  const desktopTriggerButton = (
    <Button
      id="date-range-picker-desktop"
      variant="outline"
      size="sm"
      className={cn("h-9 hover:bg-muted/10 rounded-md transition-colors date-range-picker-trigger", className)}
    >
      <CalendarIcon className="mr-2 h-4 w-4 text-black" />
      {formattedDateRange}
    </Button>
  );return (
    <div className={cn("date-range-picker-container flex items-center", className, compact && "date-range-picker-compact")}>{isMobile || useDialogOnDesktop ? (
        // Mobile - Dialog or Desktop Dialog (centered)
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open) {
            // Reset temp date range to current date range when opening
            setTempDateRange(dateRange);
          }
        }}>
          <DialogTrigger asChild>
            {isMobile ? mobileTriggerButton : desktopTriggerButton}
          </DialogTrigger>          <DialogContent className={cn(
            isMobile 
              ? "!top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[100vw] max-w-none border shadow-xl rounded-t-2xl !rounded-b-none overflow-hidden flex flex-col h-[90vh] pt-0 px-0 pb-0 bg-[#f8f8fb]"
              : `${dialogWidth} bg-[#f8f8fb] !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2`,
            compact && "max-h-[80vh]"
          )}>
            {isMobile ? (
              <>
                <DialogHeader className="px-4 pt-6 pb-3 flex justify-between items-center sticky top-0 bg-[#f8f8fb] z-30 border-b">
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
              </>            ) : (
              // Desktop Dialog Content - Simple header without cancel button
              <div className="p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Select Period</h2>
                </div>
                {desktopDialogContent}
              </div>)}
          </DialogContent>
        </Dialog>
      ) : (
        // Desktop - Popover (default behavior)
        <Popover open={isPopoverOpen} onOpenChange={(open) => {
          setIsPopoverOpen(open);
          if (open) {
            // Reset temp date range to current date range when opening
            setTempDateRange(dateRange);
          }
        }}>
          <PopoverTrigger asChild>{desktopTriggerButton}</PopoverTrigger>          <PopoverContent 
            className={cn(`${popoverWidth} p-6 shadow-lg border border-muted/30 rounded-lg bg-[#f8f8fb]`, compact && "p-4")} 
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
