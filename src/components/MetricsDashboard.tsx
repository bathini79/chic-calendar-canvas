import { MetricCard } from "@/components/MetricCard";
import { CalendarIcon, Clock, IndianRupee, Gift, UserCheck } from "lucide-react";

export function MetricsDashboard() {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
      <MetricCard
        title="Pending Confirmations"
        value="5"
        icon={<CalendarIcon className="h-4 w-4" />}
      />
      <MetricCard
        title="Upcoming Bookings"
        value="12"
        icon={<Clock className="h-4 w-4" />}
      />
      <MetricCard
        title="Today's Bookings"
        value="8"
        icon={<UserCheck className="h-4 w-4" />}
      />
      <MetricCard
        title="Today's Revenue"
        value="₹8,500"
        icon={<IndianRupee className="h-4 w-4" />}
      />
      <MetricCard
        title="Upcoming Birthdays"
        value="3"
        icon={<Gift className="h-4 w-4" />}
      />
    </div>
  );
}