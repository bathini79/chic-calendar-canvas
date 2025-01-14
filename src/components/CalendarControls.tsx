import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
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

interface CalendarControlsProps {
  date: Date;
  setDate: (date: Date) => void;
  interval: number;
  setInterval: (interval: number) => void;
}

export function CalendarControls({ 
  date, 
  setDate, 
  interval, 
  setInterval 
}: CalendarControlsProps) {
  const { toast } = useToast();
  const isMobile = window.innerWidth < 768;

  const handlePreviousDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(addDays(date, 1));
  const handleToday = () => setDate(new Date());

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={isMobile ? "w-full" : "min-w-[240px]"}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
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
          <Button variant="outline" onClick={handleToday} className="whitespace-nowrap">
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={interval.toString()}
            onValueChange={(value) => setInterval(Number(value))}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "New booking functionality will be added in the next update.",
              });
            }}
            className="whitespace-nowrap"
          >
            + New Booking
          </Button>
        </div>
      </div>
    </div>
  );
}