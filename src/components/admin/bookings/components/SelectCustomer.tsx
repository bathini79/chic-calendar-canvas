
import React, { useState, useEffect } from "react";
import { CustomerSearch } from "./CustomerSearch";
import { Customer, CustomerMembership } from "@/pages/admin/bookings/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CreateClientDialog } from "./CreateClientDialog";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface SelectCustomerProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  setShowCreateForm: (show: boolean) => void;
}

export const SelectCustomer: React.FC<SelectCustomerProps> = ({
  selectedCustomer,
  setSelectedCustomer,
  setShowCreateForm,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);

  // Fetch memberships when a customer is selected
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerMemberships(selectedCustomer.id);
    } else {
      setMemberships([]);
    }
  }, [selectedCustomer?.id]);

  const fetchCustomerMemberships = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          membership:membership_id (
            id, name, discount_type, discount_value, 
            applicable_services, applicable_packages,
            min_billing_amount, max_discount_value
          )
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active');

      if (error) throw error;
      
      // Filter memberships by validity
      const now = new Date();
      const validMemberships = data?.filter(membership => {
        const endDate = new Date(membership.end_date);
        return now <= endDate;
      }) || [];
      
      setMemberships(validMemberships as CustomerMembership[]);
    } catch (error: any) {
      console.error("Error fetching customer memberships:", error);
    }
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold mb-4">Select a client</h3>
        {!selectedCustomer ? (
          <>
            <CustomerSearch
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setShowCreateForm(false);
              }}
            />
            <div className="mt-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="bg-primary/10 h-10 w-10">
                    <AvatarFallback className="text-primary">
                      +
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">Add new client</span>
                </div>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 bg-primary/10">
                <AvatarFallback>
                  {selectedCustomer.full_name?.charAt(0)?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-medium text-base">
                  {selectedCustomer.full_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer.email}
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-gray-600 hover:text-gray-900 mt-2"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change Customer
                </Button>
              </div>
            </div>
            
            {memberships.length > 0 && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Memberships</h4>
                <div className="flex flex-col gap-2">
                  {memberships.map((membership) => (
                    <div key={membership.id} className="flex flex-col p-2 border rounded-md bg-primary/5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="mb-1">
                          {membership.membership?.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Expires: {format(new Date(membership.end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-xs">
                        Discount: {membership.membership?.discount_type === 'percentage' 
                          ? `${membership.membership?.discount_value}%` 
                          : `₹${membership.membership?.discount_value}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateClientDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={(customer) => {
          setSelectedCustomer(customer);
          setShowCreateForm(false);
        }}
      />
    </div>
  );
};
