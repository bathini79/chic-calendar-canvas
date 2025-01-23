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
              "booking-block absolute left-0 right-0 px-2 py-1 m-1 rounded-md text-sm",
              {
                "bg-green-100 border-green-200 border": status === "confirmed",
                "bg-yellow-100 border-yellow-200 border": status === "pending",
                "bg-red-100 border-red-200 border": status === "canceled"
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