
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Award } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/pages/admin/bookings/types';
import { Badge } from "@/components/ui/badge";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({ onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customersWithMemberships, setCustomersWithMemberships] = useState<Set<string>>(new Set());

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer');

      if (error) throw error;
      // Convert the database profiles to Customer type
      return data.map(profile => ({
        id: profile.id,
        email: profile.email,
        phone_number: profile.phone_number,
        full_name: profile.full_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        admin_created: profile.admin_created,
        phone_verified: profile.phone_verified,
        role: profile.role
      } as Customer));
    }
  });

  // Fetch customers with active memberships
  const { data: memberships = [] } = useQuery({
    queryKey: ['customer_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_memberships')
        .select('customer_id')
        .eq('status', 'active');

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    // Create a set of customer IDs who have active memberships
    const membershipSet = new Set(memberships.map(membership => membership.customer_id));
    setCustomersWithMemberships(membershipSet);
  }, [memberships]);

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
          filteredCustomers.slice(0, 5).map((customer) => (
            <Button
              key={customer.id}
              variant="ghost"
              className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50"
              onClick={() => onSelect(customer)}
            >
              <div className="flex items-center gap-3 w-full">
                <Avatar className="bg-primary/10">
                  <AvatarFallback>
                    {customer.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-1">
                    {customer.full_name}
                    {customersWithMemberships.has(customer.id) && (
                      <Badge variant="secondary" className="flex items-center gap-1 ml-1">
                        <Award className="h-3 w-3" />
                        <span>Member</span>
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </div>
              </div>
            </Button>
          ))
        )}
      </div>
    </div>
  );
};
