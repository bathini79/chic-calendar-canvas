import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, CalendarIcon } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DateRangeType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface TimeRangeFilterProps {
  value: DateRangeType;
  dateRange: DateRange;
  onValueChange: (value: DateRangeType) => void;
  onRangeChange: (range: DateRange) => void;
}

export function TimeRangeFilter({ 
  value, 
  dateRange, 
  onValueChange, 
  onRangeChange 
}: TimeRangeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const getDateRangeLabel = () => {
    switch (value) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'last7days':
        return 'Last 7 Days';
      case 'last30days':
        return 'Last 30 Days';
      case 'thisMonth':
        return 'This Month';
      case 'custom':
        return `${format(dateRange.startDate, 'MMM dd, yyyy')} - ${format(dateRange.endDate, 'MMM dd, yyyy')}`;
      default:
        return 'Select Date Range';
    }
  };
  
  const handleSelectChange = (newValue: DateRangeType) => {
    onValueChange(newValue);
    
    const today = new Date();
    let newStartDate: Date;
    let newEndDate: Date;
    
    switch (newValue) {
      case 'today':
        newStartDate = startOfDay(today);
        newEndDate = endOfDay(today);
        break;
      case 'yesterday':
        newStartDate = startOfDay(subDays(today, 1));
        newEndDate = endOfDay(subDays(today, 1));
        break;
      case 'last7days':
        newStartDate = startOfDay(subDays(today, 6));
        newEndDate = endOfDay(today);
        break;
      case 'last30days':
        newStartDate = startOfDay(subDays(today, 29));
        newEndDate = endOfDay(today);
        break;
      case 'thisMonth':
        newStartDate = startOfMonth(today);
        newEndDate = endOfMonth(today);
        break;
      case 'custom':
        // Keep existing custom range
        newStartDate = dateRange.startDate;
        newEndDate = dateRange.endDate;
        setIsCalendarOpen(true);
        break;
      default:
        newStartDate = startOfDay(subDays(today, 29));
        newEndDate = endOfDay(today);
    }
    
    if (newValue !== 'custom' || !isCalendarOpen) {
      onRangeChange({ startDate: newStartDate, endDate: newEndDate });
    }
  };
  
  const handleRangeSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const newStartDate = dateRange.startDate;
    let newEndDate = dateRange.endDate;
    
    // If we're selecting the first date, or if the selected date is before the current start date
    if (!newStartDate || date < newStartDate) {
      onRangeChange({ 
        startDate: startOfDay(date),
        endDate: newEndDate
      });
    } else {
      // We're selecting the end date
      onRangeChange({ 
        startDate: newStartDate,
        endDate: endOfDay(date)
      });
      setIsCalendarOpen(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={getDateRangeLabel()} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7days">Last 7 Days</SelectItem>
          <SelectItem value="last30days">Last 30 Days</SelectItem>
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
      
      {value === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="ml-2"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.startDate, 'MMM dd, yyyy')} - {format(dateRange.endDate, 'MMM dd, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              defaultMonth={dateRange.startDate}
              selected={{
                from: dateRange.startDate,
                to: dateRange.endDate,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  onRangeChange({
                    startDate: startOfDay(range.from),
                    endDate: range.to ? endOfDay(range.to) : endOfDay(range.from)
                  });
                }
                if (range?.to) {
                  setIsCalendarOpen(false);
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
