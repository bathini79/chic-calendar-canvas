import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

export const LocationSelector = ({ locations, value, onChange, className = "" }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={`w-[180px] ${className}`}>
      <div className="flex items-center">
        <MapPin className="mr-2 h-4 w-4" />
        <SelectValue placeholder="All Locations" />
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Locations</SelectItem>
      {locations?.map(location => (
        <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);