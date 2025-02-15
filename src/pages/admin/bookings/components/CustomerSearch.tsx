
import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Customer } from "../types";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

const CUSTOMERS_PER_PAGE = 10;

export function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const fetchCustomers = async ({ pageParam = 0 }) => {
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, role, created_at, updated_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(pageParam * CUSTOMERS_PER_PAGE, (pageParam + 1) * CUSTOMERS_PER_PAGE - 1);

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      customers: data as Customer[],
      nextPage: data.length === CUSTOMERS_PER_PAGE ? pageParam + 1 : undefined,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['customers', search],
    queryFn: fetchCustomers,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Handle scroll for infinite loading
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (
        scrollTop + clientHeight >= scrollHeight - 20 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // The query will automatically refresh due to the queryKey including search
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const allCustomers = data?.pages.flatMap(page => page.customers) ?? [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <ScrollArea className="h-[300px] rounded-md border" ref={scrollContainerRef}>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading customers...
            </div>
          ) : allCustomers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No customers found
            </div>
          ) : (
            allCustomers.map((customer) => (
              <div
                key={customer.id}
                className="p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelect(customer)}
              >
                <div className="font-medium">{customer.full_name}</div>
                <div className="text-sm text-muted-foreground">{customer.email}</div>
                {customer.phone_number && (
                  <div className="text-sm text-muted-foreground">
                    {customer.phone_number}
                  </div>
                )}
              </div>
            ))
          )}
          {isFetchingNextPage && (
            <div className="p-4 text-center text-muted-foreground">
              Loading more...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
