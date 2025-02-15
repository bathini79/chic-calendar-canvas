
import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "../types";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

export function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, role, created_at, updated_at')
      .eq('role', 'customer')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    if (error) {
      console.error('Search error:', error);
      return;
    }

    setResults(data || []);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {results.length > 0 && (
        <div className="border rounded-md divide-y">
          {results.map((customer) => (
            <div
              key={customer.id}
              className="p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(customer)}
            >
              <div className="font-medium">{customer.full_name}</div>
              <div className="text-sm text-muted-foreground">{customer.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
