
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreVertical, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MetricCardProps {
  title: string;
  children: React.ReactNode;
  locations?: { id: string, name: string }[];
  timePeriods?: { value: string, label: string }[];
  onFilterChange?: (locationId: string, timePeriod: string) => void;
  defaultLocation?: string;
  defaultTimePeriod?: string;
}

export function MetricCard({ 
  title, 
  children, 
  locations = [], 
  timePeriods = [],
  onFilterChange,
  defaultLocation = "all",
  defaultTimePeriod = "7days"
}: MetricCardProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(defaultTimePeriod);
  
  const handleApplyChanges = () => {
    if (onFilterChange) {
      onFilterChange(selectedLocation, selectedTimePeriod);
    }
    setIsFilterOpen(false);
  };
  
  const locationDisplay = selectedLocation === "all" 
    ? "All locations" 
    : locations.find(loc => loc.id === selectedLocation)?.name || "All locations";
    
  const timePeriodDisplay = timePeriods.find(tp => tp.value === selectedTimePeriod)?.label || "Last 7 days";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Selected locations</h3>
                  <Select 
                    value={selectedLocation} 
                    onValueChange={setSelectedLocation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Time period</h3>
                  <Select 
                    value={selectedTimePeriod} 
                    onValueChange={setSelectedTimePeriod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      {timePeriods.map(period => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(false)}>
                    Close
                  </Button>
                  <Button size="sm" onClick={handleApplyChanges}>
                    Apply changes
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-sm text-muted-foreground">
          {locationDisplay}, {timePeriodDisplay}
        </p>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
