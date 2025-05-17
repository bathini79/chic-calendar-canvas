import React, { useLayoutEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UseFormReturn } from 'react-hook-form';

interface LocationsSectionProps {
  form: UseFormReturn<any>;
  locations: any[];
  selectedLocations: string[];
  handleLocationChange: (locationId: string) => void;
  isMobile?: boolean;
}

export function LocationsSection({ 
  form, 
  locations, 
  selectedLocations, 
  handleLocationChange,
  isMobile = false
}: LocationsSectionProps) {
  // Force set a minimum height for consistency
  React.useLayoutEffect(() => {
    // Reset scroll position when component mounts
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);
  return (
    <div className={`p-6 ${isMobile ? 'min-h-[300px]' : 'min-h-[500px]'}`}>
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-1">Locations</h2>
        <p className="text-sm text-muted-foreground">Select locations where this staff member works</p>
      </div><FormField
        control={form.control}
        name="locations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Locations *</FormLabel>
            <FormControl>
              <div className="border border-input rounded-md p-4 space-y-2">
                {locations?.length ? (
                  locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`location-${location.id}`}
                        checked={selectedLocations.includes(location.id)}
                        onCheckedChange={(checked) => {
                          handleLocationChange(location.id);
                          // Directly update field value to ensure validation happens
                          const newValue = checked
                            ? [...(field.value || []), location.id]
                            : (field.value || []).filter(id => id !== location.id);
                          field.onChange(newValue);
                        }}
                      />
                      <Label
                        htmlFor={`location-${location.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {location.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No locations available
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
