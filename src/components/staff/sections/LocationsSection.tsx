import React, { useLayoutEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface LocationsSectionProps {
  form: UseFormReturn<any>;
  locations: any[];
  selectedLocations: string[];
  handleLocationChange: (locationId: string, checked: boolean) => void;
  isMobile?: boolean;
}

export function LocationsSection({ 
  form, 
  locations, 
  selectedLocations, 
  handleLocationChange,
  isMobile = false
}: LocationsSectionProps) {
  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className={cn(
      "space-y-6",
      isMobile ? "px-4" : "pl-32 pr-8"
    )}>
      <div className={cn(
        "border rounded-lg p-6 bg-white",
        isMobile ? "max-w-full" : "max-w-[680px]"
      )}>
        <h3 className="text-lg font-semibold mb-4">Location Settings</h3>
        
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className={cn(
              isMobile ? "max-w-full" : "max-w-[620px]"
            )}>
              <FormField
                control={form.control}
                name="locations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(
                      "text-base",
                      isMobile ? "mb-2" : "mb-4"
                    )}>Locations *</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {locations.map((location) => (
                          <div 
                            key={location.id} 
                            className={cn(
                              "flex items-center space-x-3 rounded-lg transition-colors hover:bg-gray-50 border",
                              isMobile ? "p-2" : "p-3"
                            )}
                          >
                            <Checkbox
                              checked={selectedLocations.includes(location.id)}
                              onCheckedChange={(checked: boolean) => {
                                handleLocationChange(location.id, checked);
                                // Update form field value
                                const newValue = checked
                                  ? [...(field.value || []), location.id]
                                  : (field.value || []).filter(id => id !== location.id);
                                field.onChange(newValue);
                              }}
                              className={cn(
                                "h-5 w-5",
                                isMobile ? "h-4 w-4" : "h-5 w-5"
                              )}
                            />
                            <label
                              htmlFor={location.id}
                              className={cn(
                                "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1",
                                isMobile ? "text-[14px]" : "text-[15px]"
                              )}
                            >
                              {location.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
