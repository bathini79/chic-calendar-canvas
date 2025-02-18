import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Customer } from '../types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuickCustomerCreate } from './QuickCustomerCreate';

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer) => void;
}

const CustomerSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: initialCustomers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer');

      if (error) {
        throw error;
      }
      return data as Customer[];
    },
  });

  useEffect(() => {
    if (initialCustomers) {
      setSearchResults(initialCustomers);
    }
  }, [initialCustomers]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query === '') {
      setSearchResults(initialCustomers || []);
      return;
    }

    if (initialCustomers) {
      const results = initialCustomers.filter(
        (customer) =>
          customer.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          customer.email?.toLowerCase().includes(query.toLowerCase()) ||
          customer.phone_number?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setSearchResults((prev) => [customer, ...prev]);
    setSelectedCustomer(customer);
    toast.success(`Customer ${customer.full_name} created!`);
  };

  return (
    <div>
      <div className="mb-4">
        <Label htmlFor="search">Search Customer:</Label>
        <Input
          type="text"
          id="search"
          placeholder="Enter name, email, or phone"
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      {isLoading ? (
        <p>Loading customers...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <div className="mb-4">
          {searchResults.length > 0 ? (
            <ul>
              {searchResults.map((customer) => (
                <li
                  key={customer.id}
                  className={`py-2 px-4 rounded cursor-pointer hover:bg-gray-100 ${
                    selectedCustomer?.id === customer.id ? 'bg-gray-200' : ''
                  }`}
                  onClick={() => handleCustomerSelect(customer)}
                >
                  {customer.full_name} ({customer.email})
                </li>
              ))}
            </ul>
          ) : (
            <p>No customers found.</p>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="mb-4">
          <p>
            <strong>Selected Customer:</strong> {selectedCustomer.full_name} ({selectedCustomer.email})
          </p>
        </div>
      )}

      <QuickCustomerCreate onCustomerCreated={handleCustomerCreated} />
    </div>
  );
};

export default CustomerSearch;
