
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type DateRangePickerProps = {
  value: string;
  onValueChange: (value: any) => void;
};

export const DateRangePicker = ({ value, onValueChange }: DateRangePickerProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Last 30 Days" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="30">Last 30 Days</SelectItem>
        <SelectItem value="90">Last 90 Days</SelectItem>
        <SelectItem value="365">Last 365 Days</SelectItem>
        <SelectItem value="custom">Custom Range</SelectItem>
      </SelectContent>
    </Select>
  );
};
