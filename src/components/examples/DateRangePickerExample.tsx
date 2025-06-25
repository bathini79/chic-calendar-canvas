import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

export function DateRangePickerExample() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 7)),
  });
  const isMobile = useIsMobile();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Date Range Picker Example</h1>
      
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-lg font-medium mb-2">Current Selected Range:</h2>
          <p>
            {dateRange?.from && dateRange?.to
              ? `${dateRange.from.toDateString()} - ${dateRange.to.toDateString()}`
              : "No date range selected"}
          </p>
        </div>
        
        <div className="flex flex-row space-x-4">
          <div>
            <h2 className="text-lg font-medium mb-2">Inline Component:</h2>
            <DateRangePicker 
              dateRange={dateRange}
              onChange={setDateRange}
              isMobile={isMobile}
            />
          </div>
          
          <div>
            <h2 className="text-lg font-medium mb-2">Dialog Version:</h2>
            <Button onClick={() => setIsDialogOpen(true)}>
              Open Date Range Dialog
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent
                className={`!top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[98vw] max-w-none border shadow-xl rounded-t-2xl !rounded-b-none overflow-hidden flex flex-col
                  ${
                    isMobile
                      ? "h-[95vh] pt-[0.5%] px-[1.5%]"
                      : "h-[98vh] pt-[3%] pl-[10%] pr-[10%]"
                  }`}
              >
                <DialogHeader className="px-4 pt-4 pb-0">
                  <DialogTitle>Select Date Range</DialogTitle>
                </DialogHeader>
                
                <div className="px-4 pb-4 flex-1 overflow-y-auto">
                  <DateRangePicker 
                    dateRange={dateRange}
                    onChange={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) {
                        setTimeout(() => setIsDialogOpen(false), 500);
                      }
                    }}
                    isMobile={isMobile}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
