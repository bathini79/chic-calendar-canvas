
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer } from "@/pages/admin/bookings/types";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { addMonths, addDays, format } from 'date-fns';

interface MembershipSaleProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
}

export function MembershipSale({ isOpen, onClose, locationId }: MembershipSaleProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const { taxRates, fetchTaxRates } = useTaxRates();
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const [appliedTaxId, setAppliedTaxId] = useState<string | null>(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [saleData, setSaleData] = useState<any>(null);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  
  // Fetch memberships data
  useEffect(() => {
    async function fetchMemberships() {
      try {
        const { data, error } = await supabase
          .from("memberships")
          .select("*")
          .order("name");
        
        if (error) throw error;
        setMemberships(data || []);
      } catch (error) {
        console.error("Error fetching memberships:", error);
      }
    }
    
    fetchMemberships();
    fetchTaxRates();
  }, []);
  
  // Load tax settings when location changes
  useEffect(() => {
    const loadTaxSettings = async () => {
      if (locationId) {
        const settings = await fetchLocationTaxSettings(locationId);
        if (settings && settings.service_tax_id) {
          setAppliedTaxId(settings.service_tax_id);
        }
      }
    };
    
    loadTaxSettings();
  }, [locationId]);
  
  // Calculate tax amount
  useEffect(() => {
    if (appliedTaxId && selectedMembership && taxRates.length > 0) {
      const taxRate = taxRates.find(tax => tax.id === appliedTaxId);
      if (taxRate) {
        // Apply tax on the price after any discount
        const priceAfterDiscount = getDiscountedPrice();
        setTaxAmount(priceAfterDiscount * (taxRate.percentage / 100));
      }
    } else {
      setTaxAmount(0);
    }
  }, [appliedTaxId, selectedMembership, taxRates, discountType, discountValue]);
  
  // Filter memberships by search term
  const filteredMemberships = memberships.filter(membership => 
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (membership.description && membership.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const handleMembershipSelect = (membership: any) => {
    setSelectedMembership(membership);
  };
  
  const getDiscountedPrice = () => {
    if (!selectedMembership) return 0;
    
    let price = selectedMembership.discount_value || 0;
    
    if (discountType === 'percentage') {
      price = price * (1 - (discountValue / 100));
    } else if (discountType === 'fixed') {
      price = Math.max(0, price - discountValue);
    }
    
    return price;
  };
  
  const getTotalPrice = () => {
    const subtotal = getDiscountedPrice();
    return subtotal + taxAmount;
  };
  
  const handleTaxChange = (taxId: string) => {
    if (taxId === "none") {
      setAppliedTaxId(null);
    } else {
      setAppliedTaxId(taxId);
    }
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
      const subtotal = getDiscountedPrice();
      const total = getTotalPrice();
      
      // Calculate membership validity dates
      const startDate = new Date();
      let endDate;
      
      if (selectedMembership.validity_unit === 'months') {
        endDate = addMonths(startDate, selectedMembership.validity_period);
      } else {
        endDate = addDays(startDate, selectedMembership.validity_period);
      }
      
      // 1. Create membership sale record
      const { data: saleData, error: saleError } = await supabase
        .from('membership_sales')
        .insert({
          customer_id: selectedCustomer.id,
          membership_id: selectedMembership.id,
          location_id: locationId,
          amount: subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_method: paymentMethod,
          tax_rate_id: appliedTaxId,
          status: 'completed'
        })
        .select()
        .single();
      
      if (saleError) throw saleError;
      
      // 2. Create customer_membership record
      const { error: membershipError } = await supabase
        .from('customer_memberships')
        .insert({
          customer_id: selectedCustomer.id,
          membership_id: selectedMembership.id,
          amount_paid: total,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active'
        });
      
      if (membershipError) throw membershipError;
      
      // Set sale data for summary
      setSaleData({
        ...saleData,
        membership: selectedMembership,
        customer: selectedCustomer,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        start_date: startDate,
        end_date: endDate
      });
      
      setSaleComplete(true);
      setShowSummary(true);
      toast.success("Membership sold successfully!");
    } catch (error: any) {
      console.error("Error processing membership sale:", error);
      toast.error(error.message || "Failed to process payment");
    }
  };
  
  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedMembership(null);
    setSearchTerm("");
    setDiscountType('none');
    setDiscountValue(0);
    setSaleComplete(false);
    setShowSummary(false);
    setSaleData(null);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
  };
  
  const renderSalesSummary = () => {
    if (!saleData || !saleData.membership) return null;
    
    return (
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Sale Complete</h3>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-medium">
            Successful
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{saleData.customer.full_name}</p>
            <p className="text-sm text-muted-foreground">{saleData.customer.email}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Membership Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Membership:</span>
              <span className="font-medium">{saleData.membership.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validity:</span>
              <span className="font-medium">{saleData.membership.validity_period} {saleData.membership.validity_unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid From:</span>
              <span className="font-medium">{format(new Date(saleData.start_date), 'PPP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until:</span>
              <span className="font-medium">{format(new Date(saleData.end_date), 'PPP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount Type:</span>
              <span className="font-medium">
                {saleData.membership.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount Value:</span>
              <span className="font-medium">
                {saleData.membership.discount_type === 'percentage' 
                  ? `${saleData.membership.discount_value}%` 
                  : formatPrice(saleData.membership.discount_value)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatPrice(saleData.subtotal)}</span>
            </div>
            
            {discountType !== 'none' && (
              <div className="flex justify-between text-green-600">
                <span>Discount Applied:</span>
                <span>
                  {discountType === 'percentage' 
                    ? `-${discountValue}%` 
                    : `-${formatPrice(discountValue)}`}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatPrice(saleData.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>{formatPrice(saleData.total_amount)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="capitalize">{saleData.payment_method}</span>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-4 mt-4">
          <Button variant="outline" onClick={resetForm}>
            New Sale
          </Button>
          <Button onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 h-[80vh]">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Add Sale</DialogTitle>
        </DialogHeader>
        
        {showSummary && saleComplete ? (
          renderSalesSummary()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            <div className="border-r relative">
              <div className="p-6">
                <Tabs defaultValue="memberships">
                  <TabsList className="mb-4">
                    <TabsTrigger value="memberships">Memberships</TabsTrigger>
                  </TabsList>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search memberships..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <TabsContent value="memberships" className="m-0">
                    <ScrollArea className="h-[calc(80vh-220px)]">
                      <div className="grid grid-cols-1 gap-4">
                        {filteredMemberships.length > 0 ? (
                          filteredMemberships.map((membership) => (
                            <Card 
                              key={membership.id} 
                              className={`cursor-pointer transition-colors ${
                                selectedMembership?.id === membership.id 
                                  ? 'border-primary' 
                                  : 'hover:border-primary/50'
                              }`}
                              onClick={() => handleMembershipSelect(membership)}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-semibold">{membership.name}</h3>
                                    {membership.description && (
                                      <p className="text-sm text-muted-foreground">{membership.description}</p>
                                    )}
                                    <div className="mt-2 space-y-1">
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Validity:</span> {membership.validity_period} {membership.validity_unit}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Discount:</span> {' '}
                                        {membership.discount_type === 'percentage' 
                                          ? `${membership.discount_value}%` 
                                          : formatPrice(membership.discount_value)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="font-semibold">{formatPrice(membership.discount_value)}</div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No memberships found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="flex flex-col h-full">
              <div className="flex-grow overflow-auto">
                <SelectCustomer
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  setShowCreateForm={setShowCreateForm}
                />
                
                {selectedMembership && (
                  <div className="p-6 border-t">
                    <h3 className="font-semibold mb-4">Payment Details</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Membership</span>
                        <span>{selectedMembership.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span>{formatPrice(selectedMembership.discount_value)}</span>
                      </div>
                      
                      {/* Discount Controls */}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <div className="flex gap-2">
                          <Select value={discountType} onValueChange={(value) => setDiscountType(value as any)}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {discountType !== 'none' && (
                            <Input
                              type="number"
                              className="w-[80px]"
                              value={discountValue}
                              onChange={(e) => setDiscountValue(Number(e.target.value))}
                              min={0}
                              max={discountType === 'percentage' ? 100 : undefined}
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* Tax Selection */}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tax</span>
                        <Select value={appliedTaxId || "none"} onValueChange={handleTaxChange}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="No Tax" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Tax</SelectItem>
                            {taxRates.map(tax => (
                              <SelectItem key={tax.id} value={tax.id}>
                                {tax.name} ({tax.percentage}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax Amount</span>
                          <span>{formatPrice(taxAmount)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span>{formatPrice(getTotalPrice())}</span>
                      </div>
                      
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Payment Method</label>
                        <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t mt-auto">
                <Button 
                  className="w-full" 
                  disabled={!selectedCustomer || !selectedMembership}
                  onClick={handlePayNow}
                >
                  Pay Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
