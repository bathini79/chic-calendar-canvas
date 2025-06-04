import React, { useState, useEffect } from "react";
import { CustomerSearch } from "./CustomerSearch";
import { Customer } from "@/pages/admin/bookings/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CreateClientDialog } from "./CreateClientDialog";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [customersWithMemberships, setCustomersWithMemberships] = useState<
    Set<string>
  >(new Set());

  // Fetch customers with active memberships
  const { data: memberships = [] } = useQuery({
    queryKey: ["customer_memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_memberships")
        .select("customer_id")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    // Create a set of customer IDs who have active memberships
    const membershipSet = new Set(
      memberships.map((membership) => membership.customer_id)
    );
    setCustomersWithMemberships(membershipSet);
  }, [memberships]);

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <div className="p-6 border-b">
        {!selectedCustomer ? (
          <>
            <h3 className="text-lg font-semibold mb-4">Select a client</h3>
            <div>
              <CustomerSearch
                onSelect={(customer) => {
                  setSelectedCustomer(customer);
                  setShowCreateForm(false);
                }}
              />
            </div>
            <div className="mt-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="bg-primary/10 h-10 w-10">
                    <AvatarFallback className="text-primary">+</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">Add new client</span>
                </div>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Enlarged Avatar */}
            <Avatar className="h-16 w-16 bg-primary/10">
              <AvatarFallback>
                {selectedCustomer.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Customer Info */}
            <div className="text-center">
              <h3 className="font-medium text-base flex items-center justify-center gap-2">
                {selectedCustomer.full_name}
                {customersWithMemberships.has(selectedCustomer.id) && (
                  <Badge
                    variant="info"
                    className="flex items-center gap-1 ml-1"
                  >
                    <Award className="h-3 w-3" />
                    <span>Member</span>
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedCustomer.phone_number}
              </p>
            </div>

            {/* Change Customer Button */}
            <Button
              variant="link"
              className="p-0 h-auto text-sm text-gray-600 hover:text-gray-900"
              onClick={() => setSelectedCustomer(null)}
            >
              Change Customer
            </Button>
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
