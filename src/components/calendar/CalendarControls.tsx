import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, CalendarIcon, List, LayoutGrid } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  setDate, 
  interval, 
  setInterval,
  viewMode,
  setViewMode
}: CalendarControlsProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handlePreviousDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(addDays(date, 1));
  const handleToday = () => setDate(new Date());

  const jumpToTime = (period: 'morning' | 'afternoon' | 'evening') => {
    const currentDate = new Date(date);
    switch (period) {
      case 'morning':
        currentDate.setHours(9, 0, 0);
        break;
      case 'afternoon':
        currentDate.setHours(12, 0, 0);
        break;
      case 'evening':
        currentDate.setHours(17, 0, 0);
        break;
    }
    setDate(currentDate);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={isMobile ? "w-[140px]" : "w-[180px]"}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="px-3">
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={interval.toString()}
            onValueChange={(value) => setInterval(Number(value))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>

          <Button 
            size="sm"
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "New booking functionality will be added in the next update.",
              });
            }}
          >
            + New Booking
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => jumpToTime('morning')}>Morning</Button>
        <Button variant="outline" size="sm" onClick={() => jumpToTime('afternoon')}>Afternoon</Button>
        <Button variant="outline" size="sm" onClick={() => jumpToTime('evening')}>Evening</Button>
      </div>
    </div>
  );
}