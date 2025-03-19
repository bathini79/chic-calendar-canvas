
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DailyRevenueChart } from './DailyRevenueChart';
import ServiceRevenueChart from './ServiceRevenueChart';
import { RevenueDataTable } from './RevenueDataTable';

interface DailyRevenueProps {
  locationId?: string;
  expanded?: boolean;
  onExpand?: () => void;
  locations?: Array<{ id: string; name: string }>;
}

const DailyRevenue: React.FC<DailyRevenueProps> = ({ locationId, expanded, onExpand, locations }) => {
  const [date, setDate] = useState<Date>(new Date());
  const formattedDate = format(date, 'PPP');

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Daily Revenue</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="flex items-center justify-between">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-[300px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? formattedDate : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                disabled={(date) =>
                  date > new Date() || date < new Date('2020-01-01')
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <DailyRevenueChart selectedDate={date} locationId={locationId} />
        <ServiceRevenueChart selectedDate={date} locationId={locationId} />
        <RevenueDataTable selectedDate={date} locationId={locationId} />
      </CardContent>
    </Card>
  );
};

export default DailyRevenue;
