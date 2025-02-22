
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/pages/admin/bookings/types';

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({ onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer');

      if (error) throw error;
      return data as Customer[];
    }
  });

  useEffect(() => {
    if (customers) {
      const filtered = customers.filter(customer => 
        customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          type="text"
          placeholder="Search client or leave empty"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading customers...</p>
        ) : (
          filteredCustomers.map((customer) => (
            <Button
              key={customer.id}
              variant="ghost"
              className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50"
              onClick={() => onSelect(customer)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="bg-primary/10">
                  <AvatarFallback>
                    {customer.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{customer.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.email}
                  </div>
                </div>
              </div>
            </Button>
          ))
        )}
      </div>
    </div>
  );
};
