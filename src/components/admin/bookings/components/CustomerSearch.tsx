
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Award, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/pages/admin/bookings/types';
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({ onSelect }) => {  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customersWithMemberships, setCustomersWithMemberships] = useState<Set<string>>(new Set());
  const [visibleCustomers, setVisibleCustomers] = useState<Customer[]>([]);
  const [displayCount, setDisplayCount] = useState(5);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
      
      // Always ensure we show exactly 5 clients at a time (or all if less than 5)
      const showCount = Math.min(displayCount, filtered.length);
      console.log(`Showing ${showCount} customers out of ${filtered.length} total`);
      setVisibleCustomers(filtered.slice(0, showCount));
    }
  }, [searchQuery, customers, displayCount]);  const handleScroll = useCallback(() => {
    const container = listContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when the user scrolls near the bottom (within 50px of the bottom)      
    if (scrollHeight - scrollTop - clientHeight < 50) {
      // Only load more if we haven't shown all customers yet
      if (displayCount < filteredCustomers.length) {
        // Always increment by exactly 5, to ensure we show 5 customers per "page"
        const newCount = Math.min(filteredCustomers.length, displayCount + 5);
        console.log(`Loading more customers: ${displayCount} -> ${newCount}`);
        setDisplayCount(newCount);
      }
    }
  }, [displayCount, filteredCustomers.length]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
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
      </div>      <div 
        className="space-y-2 overflow-y-auto"
        ref={listContainerRef}
        style={{ height: '280px', overflowY: 'auto' }}
      >
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading customers...</p>
        ) : (
          visibleCustomers.map((customer) => (            <Button
              key={customer.id}
              variant="ghost"
              className="w-full justify-start text-left p-2 h-auto hover:bg-gray-50 group"
              style={{ minHeight: '50px', height: 'auto', marginBottom: '2px' }}
              onClick={() => onSelect(customer)}
            ><div className="flex items-center gap-3 w-full">
                <Avatar className="bg-primary/10">
                  <AvatarFallback>
                    {customer.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {customer.full_name}
                    {customersWithMemberships.has(customer.id) && (
                      <Badge variant="info" className="flex items-center gap-1 ml-1">
                        <Award className="h-3 w-3" />
                        <span>Member</span>
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {customer.phone_number}
                  </div>
                </div>
                <button 
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomerToDelete(customer);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </Button>
          ))
        )}        {!isLoading && visibleCustomers.length < filteredCustomers.length && (
          <div className="py-1 text-center">
            <p className="text-xs text-muted-foreground">Scroll for more clients</p>
          </div>
        )}
      </div>      <div className="pt-1 mt-1 text-center text-xs text-muted-foreground">
        Showing {visibleCustomers.length} of {filteredCustomers.length} clients
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customerToDelete?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>            <AlertDialogAction 
              onClick={async () => {
                if (customerToDelete && !isDeleting) {
                  setIsDeleting(true);                  try {
                    // Step 1: First delete related data from other tables
                    // Delete customer memberships
                    const { error: membershipError } = await supabase
                      .from('customer_memberships')
                      .delete()
                      .eq('customer_id', customerToDelete.id);
                      
                    if (membershipError) {
                      console.error('Error deleting customer memberships:', membershipError);
                    }
                    
                    // Clean up cart items if any
                    const { error: cartError } = await supabase
                      .from('cart_items')
                      .delete()
                      .eq('user_id', customerToDelete.id);
                      
                    if (cartError) {
                      console.error('Error deleting cart items:', cartError);
                    }
                    
                   
                    
                    // Step 2: Delete the profile record
                    const { error: profileError } = await supabase
                      .from('profiles')
                      .delete()
                      .eq('id', customerToDelete.id);
                    
                    if (profileError) {
                      console.error('Error deleting profile:', profileError);
                      throw profileError;
                    }                    // Step 2: Delete the auth user using our edge function which has admin privileges
                    // This will call supabaseAdmin.auth.admin.deleteUser(userId) in the edge function
                    const { data: deleteAuthData, error: deleteAuthError } = await supabase.functions
                      .invoke('delete-auth-user', {
                        body: { userId: customerToDelete.id }
                      });
                    
                    if (deleteAuthError) {
                      console.error('Error deleting auth user:', deleteAuthError);
                      throw deleteAuthError;
                    }
                    
                    console.log('Auth user successfully deleted via Edge Function');

                    // Invalidate and refetch customers query
                    queryClient.invalidateQueries({ queryKey: ['customers'] });
                    
                    // Reset customer to delete
                    setCustomerToDelete(null);
                  } catch (error) {
                    console.error('Error deleting customer:', error);
                  } finally {
                    setIsDeleting(false);
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
