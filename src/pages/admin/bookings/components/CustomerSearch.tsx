
import React, { useState, useEffect, useRef } from "react";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { QuickCustomerCreate } from "./QuickCustomerCreate";
import type { Customer } from "../types";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string, services: string[]) => void;
}

const CUSTOMERS_PER_PAGE = 10;

export function CustomerSearch({ onSelect, onServiceSelect, onPackageSelect }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Query for services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          services_categories!inner (
            categories (
              id,
              name
            )
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Query for packages
  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_services (
            service:services (
              id,
              name,
              selling_price,
              duration
            )
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Query for customers with infinite scroll
  const fetchCustomers = async ({ pageParam = 0 }) => {
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, role')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(pageParam * CUSTOMERS_PER_PAGE, (pageParam + 1) * CUSTOMERS_PER_PAGE - 1);

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
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

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setOpen(false);
  };

  const handleCreateCustomer = (customer: Customer) => {
    onSelect(customer);
    setShowCreateDialog(false);
  };

  const allCustomers = data?.pages.flatMap(page => page.customers) ?? [];

  return (
    <div className="grid grid-cols-5 gap-4 h-full">
      {/* Customer Search - 40% */}
      <div className="col-span-2 space-y-4">
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
                    <ScrollArea className="h-[300px]">
                      {allCustomers.map((customer) => (
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
                      ))}
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
      </div>

      {/* Services and Packages Selection - 60% */}
      <div className="col-span-3">
        <Tabs defaultValue="services" className="w-full">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-2 gap-4">
                {services?.map((service) => (
                  <Card 
                    key={service.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onServiceSelect?.(service.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <div className="flex flex-wrap gap-1">
                        {service.services_categories.map((sc: any) => (
                          <Badge key={sc.categories.id} variant="secondary">
                            {sc.categories.name}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {service.description || "No description available"}
                      </p>
                      <div className="flex justify-between items-center">
                        <span>₹{service.selling_price}</span>
                        <span className="text-sm text-muted-foreground">
                          {service.duration} min
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-2 gap-4">
                {packages?.map((pkg) => (
                  <Card 
                    key={pkg.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      const services = pkg.package_services.map((ps: any) => ps.service.id);
                      onPackageSelect?.(pkg.id, services);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {pkg.description || "No description available"}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {pkg.package_services.map((ps: any) => (
                          <Badge key={ps.service.id} variant="outline">
                            {ps.service.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span>₹{pkg.price}</span>
                        <span className="text-sm text-muted-foreground">
                          {pkg.duration} min
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
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
