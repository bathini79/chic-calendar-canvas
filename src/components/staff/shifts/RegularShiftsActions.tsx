
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface RegularShiftsActionsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
}

export function RegularShiftsActions({
  locations,
  selectedLocation,
  setSelectedLocation
}: RegularShiftsActionsProps) {
  return (
    <div className="flex gap-2 items-center">
      <select 
        className="border rounded-md p-2"
        value={selectedLocation}
        onChange={(e) => setSelectedLocation(e.target.value)}
      >
        <option value="all">All Locations</option>
        {locations.map(loc => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
      
      <Button variant="outline" className="hidden md:flex">
        Options
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
