
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { Customer } from "@/pages/admin/bookings/types";
import { Search, Check, CreditCard } from "lucide-react";
import { useMemberships, Membership } from "@/hooks/use-memberships";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MembershipSaleProps {
  open: boolean;
  onClose: () => void;
}

export const MembershipSale: React.FC<MembershipSaleProps> = ({ open, onClose }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [showSalesSummary, setShowSalesSummary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { memberships, fetchMemberships } = useMemberships();
  const [filteredMemberships, setFilteredMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    if (open) {
      fetchMemberships();
    }
  }, [open, fetchMemberships]);

  useEffect(() => {
    if (memberships) {
      const filtered = memberships.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredMemberships(filtered);
    }
  }, [searchQuery, memberships]);

  const calculateTax = (price: number) => {
    // Default tax rate of 18% (can be made configurable)
    return price * 0.18;
  };

  const handleProcessSale = async () => {
    if (!selectedCustomer || !selectedMembership) {
      toast.error("Please select both a customer and a membership");
      return;
    }

    setIsProcessing(true);
    
    try {
      const subtotal = selectedMembership.discount_value;
      const taxAmount = calculateTax(subtotal);
      const total = subtotal + taxAmount;
      
      // Record the membership sale in the database
      const { data, error } = await supabase
        .from('customer_memberships')
        .insert([
          {
            customer_id: selectedCustomer.id,
            membership_id: selectedMembership.id,
            amount_paid: total,
            status: 'active',
            start_date: new Date().toISOString(),
            // Calculate end date based on validity period and unit
            end_date: calculateEndDate(selectedMembership.validity_period, selectedMembership.validity_unit),
          }
        ]);
        
      if (error) throw error;
      
      // Record the sale transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            customer_id: selectedCustomer.id,
            amount: total,
            transaction_type: 'membership_sale',
            payment_method: 'cash', // Default, can be made configurable
            item_id: selectedMembership.id,
            item_type: 'membership',
            tax_amount: taxAmount,
          }
        ]);
        
      if (transactionError) throw transactionError;
      
      toast.success("Membership sale completed successfully");
      setShowSalesSummary(true);
    } catch (error: any) {
      console.error("Error processing membership sale:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const calculateEndDate = (period: number, unit: string): string => {
    const date = new Date();
    if (unit === 'days') {
      date.setDate(date.getDate() + period);
    } else if (unit === 'months') {
      date.setMonth(date.getMonth() + period);
    }
    return date.toISOString();
  };
  
  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedMembership(null);
    setShowSalesSummary(false);
    setSearchQuery("");
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderMembershipsList = () => (
    <div className="space-y-3 mt-4">
      {filteredMemberships.map(membership => (
        <Card 
          key={membership.id}
          className={`cursor-pointer transition-all ${selectedMembership?.id === membership.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/30'}`}
          onClick={() => setSelectedMembership(membership)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{membership.name}</h3>
                {membership.description && (
                  <p className="text-sm text-muted-foreground mt-1">{membership.description}</p>
                )}
                <div className="mt-2 text-sm">
                  <span>Validity: {membership.validity_period} {membership.validity_unit}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-lg">
                  {formatPrice(membership.discount_value)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {membership.discount_type === 'percentage' ? 
                    `${membership.discount_value}% discount` : 
                    `${formatPrice(membership.discount_value)} off`}
                </div>
                {selectedMembership?.id === membership.id && (
                  <div className="flex items-center justify-end text-primary mt-2">
                    <Check size={16} className="mr-1" />
                    <span className="text-xs">Selected</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {filteredMemberships.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No memberships found matching your search.
        </div>
      )}
    </div>
  );

  const renderSalesSummary = () => {
    if (!selectedMembership || !selectedCustomer) return null;
    
    const subtotal = selectedMembership.discount_value;
    const taxAmount = calculateTax(subtotal);
    const total = subtotal + taxAmount;
    
    return (
      <div className="border rounded-lg p-6 space-y-6">
        <div className="text-center">
          <div className="bg-green-100 text-green-800 p-3 rounded-full inline-flex items-center justify-center">
            <Check size={24} />
          </div>
          <h2 className="text-xl font-bold mt-4">Sale Complete</h2>
          <p className="text-muted-foreground mt-1">The membership has been successfully sold</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-medium">{selectedCustomer.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Membership:</span>
            <span className="font-medium">{selectedMembership.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Validity:</span>
            <span>{selectedMembership.validity_period} {selectedMembership.validity_unit}</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%):</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total:</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
        
        <Button 
          className="w-full mt-4" 
          onClick={handleClose}
        >
          Close
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{showSalesSummary ? "Sale Summary" : "Sell Membership"}</SheetTitle>
        </SheetHeader>
        
        {showSalesSummary ? (
          renderSalesSummary()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search memberships..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {renderMembershipsList()}
            </div>
            
            <div className="md:col-span-5">
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Customer</h3>
                  <SelectCustomer
                    selectedCustomer={selectedCustomer}
                    setSelectedCustomer={setSelectedCustomer}
                    setShowCreateForm={setShowCreateForm}
                  />
                </div>
                
                {selectedMembership && selectedCustomer && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatPrice(selectedMembership.discount_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (18%):</span>
                        <span>{formatPrice(calculateTax(selectedMembership.discount_value))}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>
                            {formatPrice(selectedMembership.discount_value + calculateTax(selectedMembership.discount_value))}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-4"
                      disabled={isProcessing}
                      onClick={handleProcessSale}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {isProcessing ? "Processing..." : "Pay Now"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
