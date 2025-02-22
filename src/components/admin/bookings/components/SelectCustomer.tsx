import React from "react";
import { CustomerSearch } from "./CustomerSearch";
import { Customer } from "@/pages/admin/bookings/types";

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
  return (
    <div className="w-full border-r overflow-y-auto p-6">
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Select Customer</h3>
        {!selectedCustomer ? (
          <CustomerSearch
            onSelect={(customer) => {
              setSelectedCustomer(customer);
              setShowCreateForm(false);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {selectedCustomer.full_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer.email}
                </p>
              </div>
              <button
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setSelectedCustomer(null)}
              >
                Change Customer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
