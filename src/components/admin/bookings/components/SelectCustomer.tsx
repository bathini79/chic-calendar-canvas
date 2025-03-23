
import React, { useState } from "react";
import { CustomerSearch } from "./CustomerSearch";
import { Customer } from "@/pages/admin/bookings/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CreateClientDialog } from "./CreateClientDialog";

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
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 bg-primary/10">
              <AvatarFallback>
                {selectedCustomer.full_name.charAt(0).toUpperCase()}
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
