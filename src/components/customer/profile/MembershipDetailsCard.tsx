import { useEffect, useState } from "react";
import { Star, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface MembershipDetailsCardProps {
  customerId: string;
}

export function MembershipDetailsCard({ customerId }: MembershipDetailsCardProps) {
  const { customerMemberships, fetchCustomerMemberships } = useCustomerMemberships();
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false); // Add state to track if we've already fetched

  useEffect(() => {
    // Only fetch if we haven't already and we have a customerId
    if (customerId && !hasFetched) {
      setLoading(true);
      fetchCustomerMemberships(customerId)
        .then(() => {
          setHasFetched(true); // Mark as fetched after successful completion
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [customerId, fetchCustomerMemberships, hasFetched]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!customerMemberships?.length) {
    return null;
  }

  // Sort memberships by end date (latest first)
  const sortedMemberships = [...customerMemberships].sort((a, b) => {
    return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
  });

  return (
    <Card className="mb-6">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center">
          <Star className="h-5 w-5 text-yellow-500 mr-2" />
          Membership Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {sortedMemberships.map((membership) => {
          const startDate = new Date(membership.start_date);
          const endDate = new Date(membership.end_date);
          const isActive = new Date() < endDate;
          const timeToExpiry = isActive ? formatDistanceToNow(endDate, { addSuffix: true }) : 'Expired';
          
          return (
            <div key={membership.id} className="mb-4 pb-4 border-b last:border-0 last:pb-0 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{membership.membership?.name}</h3>
                <Badge variant={isActive ? "success" : "outline"}>
                  {isActive ? 'Active' : 'Expired'}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Start date: {format(startDate, "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>End date: {format(endDate, "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center font-medium mt-2">
                  {isActive ? (
                    <span className="text-primary">Expires {timeToExpiry}</span>
                  ) : (
                    <span className="text-muted-foreground">Expired {timeToExpiry}</span>
                  )}
                </div>
              </div>
              
              <div className="mt-3 bg-muted/50 p-3 rounded-md">
                <h4 className="font-medium mb-1">Discount Details</h4>
                <p className="text-sm">
                  {membership.membership?.discount_type === 'percentage' 
                    ? `${membership.membership?.discount_value}% off` 
                    : `₹${membership.membership?.discount_value} off`}
                  {membership.membership?.max_discount_value && 
                    ` (max ₹${membership.membership?.max_discount_value})`}
                  {membership.membership?.min_billing_amount && 
                    ` on bills above ₹${membership.membership?.min_billing_amount}`}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}