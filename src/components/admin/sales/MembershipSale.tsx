
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useMemberships } from "@/hooks/use-memberships";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MembershipSaleProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MembershipSale({ isOpen, onClose }: MembershipSaleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("memberships");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<any>(null);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  
  const { memberships, isLoading, fetchMemberships } = useMemberships();
  
  useEffect(() => {
    fetchMemberships();
  }, []);
  
  const filteredMemberships = searchTerm
    ? memberships.filter(membership =>
        membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (membership.description && membership.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : memberships;
    
  const calculateTotal = () => {
    if (!selectedMembership) return 0;
    return selectedMembership.max_discount_value || 0;
  };
  
  const calculateTax = () => {
    // Implement tax calculation logic here if needed
    return 0;
  };
  
  const calculateSubtotal = () => {
    return calculateTotal() - calculateTax();
  };
  
  const handleSelectMembership = (membership: any) => {
    setSelectedMembership(membership);
  };
  
  const handlePayNow = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    
    if (!selectedMembership) {
      toast.error("Please select a membership");
      return;
    }
    
    try {
      // 1. Create customer membership
      const currentDate = new Date();
      
      // Calculate end date based on validity period and unit
      let endDate = new Date(currentDate);
      if (selectedMembership.validity_unit === 'days') {
        endDate.setDate(endDate.getDate() + selectedMembership.validity_period);
      } else if (selectedMembership.validity_unit === 'months') {
        endDate.setMonth(endDate.getMonth() + selectedMembership.validity_period);
      }
      
      // Insert customer membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('customer_memberships')
        .insert({
          customer_id: selectedCustomer.id,
          membership_id: selectedMembership.id,
          start_date: currentDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          amount_paid: calculateTotal()
        })
        .select()
        .single();
        
      if (membershipError) throw membershipError;
      
      // 2. Record transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          customer_id: selectedCustomer.id,
          amount: calculateTotal(),
          transaction_type: 'sale',
          payment_method: paymentMethod,
          item_id: membershipData.id,
          item_type: 'membership',
          tax_amount: calculateTax()
        })
        .select()
        .single();
        
      if (transactionError) throw transactionError;
      
      // Set receipt data
      setReceipt({
        id: transactionData.id,
        date: format(new Date(), "PPP"),
        customer: selectedCustomer.full_name,
        membership: selectedMembership.name,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'Online'
      });
      
      setSaleCompleted(true);
      toast.success("Membership sold successfully");
      
    } catch (error: any) {
      console.error("Error completing membership sale:", error);
      toast.error(`Error: ${error.message}`);
    }
  };
  
  const handleReset = () => {
    setSelectedMembership(null);
    setSelectedCustomer(null);
    setSearchTerm("");
    setSaleCompleted(false);
    setReceipt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-lg flex flex-col overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            {saleCompleted ? "Sale Summary" : "Add Sale"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {saleCompleted ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg border shadow-sm">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold">Sale Receipt</h3>
                <p className="text-gray-500 text-sm">{receipt.date}</p>
                <p className="text-gray-500 text-sm">Transaction #{receipt.id.substring(0, 8)}</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{receipt.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Membership:</span>
                  <span className="font-medium">{receipt.membership}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{receipt.paymentMethod}</span>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatPrice(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span>{formatPrice(receipt.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatPrice(receipt.total)}</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <Button onClick={handleReset} className="w-full">
                  New Sale
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex">
            <div className="w-[60%] border-r flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search memberships..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Tabs defaultValue="memberships" value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
                <div className="px-4 pt-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="memberships" className="flex-1">Memberships</TabsTrigger>
                    <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
                    <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="memberships" className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p>Loading memberships...</p>
                    </div>
                  ) : filteredMemberships.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p>No memberships found</p>
                    </div>
                  ) : (
                    filteredMemberships.map((membership) => (
                      <Card 
                        key={membership.id} 
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          selectedMembership?.id === membership.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleSelectMembership(membership)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg">{membership.name}</h3>
                              {membership.description && (
                                <p className="text-muted-foreground text-sm mt-1">{membership.description}</p>
                              )}
                              <div className="mt-2 text-sm">
                                <p>Valid for: {membership.validity_period} {membership.validity_unit}</p>
                                <p className="mt-1">
                                  Discount: {membership.discount_type === 'percentage' ? `${membership.discount_value}%` : formatPrice(membership.discount_value)}
                                  {membership.max_discount_value && ` (Max: ${formatPrice(membership.max_discount_value)})`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {formatPrice(membership.max_discount_value || 0)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="services" className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center justify-center h-full">
                    <p>Service sales coming soon</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="products" className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center justify-center h-full">
                    <p>Product sales coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="w-[40%] flex flex-col">
              <div className="border-b p-4">
                <SelectCustomer
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  setShowCreateForm={setShowCreateForm}
                />
              </div>
              
              <div className="flex-1 p-4 flex flex-col">
                {selectedMembership ? (
                  <div className="flex-1">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h3 className="font-medium text-lg">{selectedMembership.name}</h3>
                      {selectedMembership.description && (
                        <p className="text-muted-foreground text-sm mt-1">{selectedMembership.description}</p>
                      )}
                      <p className="mt-2">
                        Valid for: {selectedMembership.validity_period} {selectedMembership.validity_unit}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p>Select a membership from the list</p>
                  </div>
                )}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatPrice(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Payment method:</span>
                    <div className="flex gap-2">
                      <Button 
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setPaymentMethod('cash')}
                      >
                        Cash
                      </Button>
                      <Button 
                        variant={paymentMethod === 'online' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setPaymentMethod('online')}
                      >
                        Online
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handlePayNow} 
                    className="w-full" 
                    disabled={!selectedMembership || !selectedCustomer}
                  >
                    Pay Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
