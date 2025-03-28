
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface LocationSelectorProps {
  locations: Array<{ id: string; name: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  includeAllOption?: boolean;
}

export const LocationSelector = ({ 
  locations, 
  value, 
  onChange, 
  className = "",
  includeAllOption = true
}: LocationSelectorProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={`w-full text-xs sm:text-sm ${className}`}>
      <div className="flex items-center truncate">
        <MapPin className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <SelectValue placeholder="Select Location" className="truncate max-w-[90%]" />
      </div>
    </SelectTrigger>
    <SelectContent className="max-h-[250px] overflow-y-auto">
      {includeAllOption && <SelectItem value="all">All Locations</SelectItem>}
      {locations?.map(location => (
        <SelectItem key={location.id} value={location.id} className="text-xs sm:text-sm">
          {location.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
