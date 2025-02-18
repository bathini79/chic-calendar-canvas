
import React, { useState } from "react";
import { CustomerSearch } from "./CustomerSearch";
import { QuickCustomerCreate } from "./QuickCustomerCreate";
import { AppointmentCreate } from "./AppointmentCreate";
import type { Customer } from "../types";

export function AdminBooking() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        {!selectedCustomer ? (
          <>
            <CustomerSearch onSelect={handleCustomerSelect} />
            <div className="text-center">
              <span className="text-sm text-muted-foreground">or</span>
            </div>
            <QuickCustomerCreate onCustomerCreated={handleCustomerSelect} />
          </>
        ) : (
          <AppointmentCreate 
            customerId={selectedCustomer.id}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        )}
      </div>
    </div>
  );
}
