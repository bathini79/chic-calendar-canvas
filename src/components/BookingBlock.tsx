import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface BookingBlockProps {
  customer: string;
  service: string;
  time: string;
  duration: number;
  status: "confirmed" | "pending" | "canceled";
  startPosition: number;
}

export function BookingBlock({ 
  customer, 
  service, 
  time, 
  duration, 
  status, 
  startPosition 
}: BookingBlockProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div 
            className={cn(
              "booking-block",
              {
                "booking-confirmed": status === "confirmed",
                "booking-pending": status === "pending",
                "booking-canceled": status === "canceled"
              }
            )}
            style={{
              top: `${startPosition * 4}rem`,
              height: `${duration * 4}rem`
            }}
          >
            <p className="font-medium">{customer}</p>
            <p className="text-sm">{service}</p>
            <p className="text-xs">{time}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{customer}</p>
            <p>{service}</p>
            <p>{time}</p>
            <p className="capitalize">{status}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}