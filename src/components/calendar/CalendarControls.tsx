import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface CalendarControlsProps {
  date: Date;
  setDate: (date: Date) => void;
  interval: number;
  setInterval: (interval: number) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export function CalendarControls({ 
  date, 
  setDate
}: CalendarControlsProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handlePreviousDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(addDays(date, 1));

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setDate(d.getDate() - 3 + i); // Center current date
    return d;
  });

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Select time</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <CalendarIcon className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">
          {format(date, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2 overflow-x-auto py-2">
            {weekDates.map((d) => (
              <button
                key={d.toISOString()}
                onClick={() => setDate(d)}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-colors
                  ${d.toDateString() === date.toDateString() 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                  }`}
              >
                <span className="text-sm font-medium">{format(d, 'dd')}</span>
                <span className="text-xs">{format(d, 'EEE')}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}