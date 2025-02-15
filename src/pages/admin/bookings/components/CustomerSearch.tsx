
import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { QuickCustomerCreate } from "./QuickCustomerCreate";
import type { Customer } from "../types";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

const CUSTOMERS_PER_PAGE = 10;

export function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setOpen(false);
  };

  const handleCreateCustomer = (customer: Customer) => {
    onSelect(customer);
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              Search customers...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search customers..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No customers found</p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => {
                        setOpen(false);
                        setShowCreateDialog(true);
                      }}
                    >
                      Create New Customer
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[300px]" ref={scrollContainerRef}>
                    {isLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading customers...
                      </div>
                    ) : (
                      allCustomers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => handleSelect(customer)}
                          className="p-2"
                        >
                          <div>
                            <div className="font-medium">{customer.full_name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                            {customer.phone_number && (
                              <div className="text-sm text-muted-foreground">
                                {customer.phone_number}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
                    {isFetchingNextPage && (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading more...
                      </div>
                    )}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          onClick={() => setShowCreateDialog(true)}
        >
          Create New
        </Button>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <QuickCustomerCreate onCreated={handleCreateCustomer} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
