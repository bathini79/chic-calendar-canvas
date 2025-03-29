
import { useState, useEffect } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { format } from "date-fns";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MembershipStatusProps {
  customerId: string;
}

export function MembershipStatus({ customerId }: MembershipStatusProps) {
  const { customerMemberships, fetchCustomerMemberships } = useCustomerMemberships();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      setLoading(true);
      fetchCustomerMemberships(customerId).finally(() => {
        setLoading(false);
      });
    }
  }, [customerId, fetchCustomerMemberships]);

  if (loading || !customerMemberships.length) {
    return null;
  }

  // Get the membership that expires the latest
  const latestMembership = customerMemberships.reduce((latest, current) => {
    return new Date(current.end_date) > new Date(latest.end_date) ? current : latest;
  }, customerMemberships[0]);

  const formattedEndDate = format(new Date(latestMembership.end_date), "MMM d, yyyy");
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="flex items-center gap-1 bg-primary/10 text-primary border-primary/30 font-medium cursor-pointer"
          >
            <BadgeCheck className="h-4 w-4" />
            <span>Member</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold">{latestMembership.membership?.name}</p>
            <p className="text-xs text-muted-foreground">Valid until {formattedEndDate}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
