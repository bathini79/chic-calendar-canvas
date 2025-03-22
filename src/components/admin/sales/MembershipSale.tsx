
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Tag, CheckCircle, ShoppingCart, Percent } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Membership } from "@/hooks/use-memberships";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer } from "@/pages/admin/bookings/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface MembershipSaleProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
}

export const MembershipSale: React.FC<MembershipSaleProps> = ({
  isOpen,
  onClose,
  locationId,
}) => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [activeTab, setActiveTab] = useState("memberships");
  
  const { taxRates, fetchTaxRates } = useTaxRates();
  const [selectedTaxRate, setSelectedTaxRate] = useState<string | null>(null);
  const [taxRateValue, setTaxRateValue] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Add discount controls
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [subtotalAfterDiscount, setSubtotalAfterDiscount] = useState(0);

  useEffect(() => {
    fetchMemberships();
    fetchTaxRates();
  }, [locationId]);

  useEffect(() => {
    if (selectedMembership) {
      calculateTotals();
    }
  }, [selectedMembership, taxRateValue, discountType, discountValue]);
  
  const calculateTotals = () => {
    if (!selectedMembership) return;
    
    const subTotal = selectedMembership.discount_value;
    
    // Calculate discount
    let discountAmt = 0;
    if (discountType === "percentage") {
      discountAmt = (subTotal * discountValue) / 100;
    } else if (discountType === "fixed") {
      discountAmt = Math.min(discountValue, subTotal);
    }
    
    setDiscountAmount(discountAmt);
    const afterDiscount = subTotal - discountAmt;
    setSubtotalAfterDiscount(afterDiscount);
    
    // Calculate tax
    const tax = (afterDiscount * taxRateValue) / 100;
    setTaxAmount(tax);
    setTotalAmount(afterDiscount + tax);
  };

  const fetchMemberships = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .order("name");

      if (error) throw error;
      
      const typedData = data?.map(item => ({
        ...item,
        validity_unit: item.validity_unit as 'days' | 'months',
        discount_type: item.discount_type as 'percentage' | 'fixed'
      })) as Membership[];
      
      setMemberships(typedData || []);
    } catch (error: any) {
      toast.error(`Error fetching memberships: ${error.message}`);
      console.error("Error fetching memberships:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReceiptNumber = async () => {
    try {
      let settings;
      
      // Get receipt settings for the location
      if (locationId) {
        const { data, error } = await supabase
          .from("receipt_settings")
          .select("*")
          .eq("location_id", locationId)
          .single();
        
        if (!error && data) {
          settings = data;
        }
      }
      
      // If no location-specific settings, get global settings
      if (!settings) {
        const { data, error } = await supabase
          .from("receipt_settings")
          .select("*")
          .is("location_id", null)
          .single();
          
        if (!error && data) {
          settings = data;
        }
      }
      
      if (settings) {
        const prefix = settings.prefix || "MS";
        const nextNumber = settings.next_number || 1;
        const receiptNumber = `${prefix}${nextNumber.toString().padStart(6, "0")}`;
        
        // Update next number
        await supabase
          .from("receipt_settings")
          .update({ next_number: nextNumber + 1 })
          .eq("id", settings.id);
          
        return receiptNumber;
      }
      
      // Default if no settings found
      return `MS${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
    } catch (error) {
      console.error("Error generating receipt number:", error);
      return `MS${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
    }
  };

  const handleComplete = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    
    if (!selectedMembership) {
      toast.error("Please select a membership");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const receipt = await generateReceiptNumber();
      setReceiptNumber(receipt);
      
      // Calculate membership end date based on validity period and unit
      const startDate = new Date();
      const endDate = new Date(startDate);
      
      if (selectedMembership.validity_unit === 'days') {
        endDate.setDate(endDate.getDate() + selectedMembership.validity_period);
      } else if (selectedMembership.validity_unit === 'months') {
        endDate.setMonth(endDate.getMonth() + selectedMembership.validity_period);
      }
      
      // Create membership sale record
      const { data: saleData, error: saleError } = await supabase
        .from("membership_sales")
        .insert({
          customer_id: selectedCustomer.id,
          membership_id: selectedMembership.id,
          amount: selectedMembership.discount_value,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          tax_rate_id: selectedTaxRate,
          location_id: locationId,
          status: "completed"
        })
        .select()
        .single();
        
      if (saleError) throw saleError;
      
      // Create customer membership record
      const { error: membershipError } = await supabase
        .from("customer_memberships")
        .insert({
          customer_id: selectedCustomer.id,
          membership_id: selectedMembership.id,
          amount_paid: totalAmount,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: "active"
        });
        
      if (membershipError) throw membershipError;
      
      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          customer_id: selectedCustomer.id,
          amount: totalAmount,
          tax_amount: taxAmount,
          payment_method: paymentMethod,
          transaction_type: "membership_sale",
          item_id: selectedMembership.id,
          item_type: "membership"
        });
        
      if (transactionError) throw transactionError;
      
      toast.success("Membership sale completed");
      setSaleComplete(true);
    } catch (error: any) {
      console.error("Error completing sale:", error);
      toast.error(`Error completing sale: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleTaxRateChange = (taxId: string) => {
    if (taxId === "none") {
      setSelectedTaxRate(null);
      setTaxRateValue(0);
    } else {
      setSelectedTaxRate(taxId);
      const tax = taxRates.find(t => t.id === taxId);
      if (tax) {
        setTaxRateValue(tax.percentage);
      }
    }
  };
  
  const handleSelectMembership = (membership: Membership) => {
    setSelectedMembership(membership);
  };
  
  const handleReset = () => {
    setSelectedMembership(null);
    setSelectedCustomer(null);
    setShowCreateForm(false);
    setSaleComplete(false);
    setReceiptNumber("");
    setPaymentMethod("cash");
    setSearchTerm("");
    setDiscountType("none");
    setDiscountValue(0);
    setDiscountAmount(0);
    setSelectedTaxRate(null);
    setTaxRateValue(0);
  };
  
  const filteredMemberships = memberships.filter(membership => 
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (membership.description && membership.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Add Sale</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-[30%] border-r">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
          </div>

          <div className="w-[70%] flex flex-col h-full">
            {!saleComplete ? (
              <>
                <div className="p-6 border-b">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="memberships" className="flex items-center gap-1">
                        <Tag size={16} />
                        <span>Memberships</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input 
                          placeholder="Search memberships..." 
                          className="pl-10"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <TabsContent value="memberships" className="m-0">
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {isLoading ? (
                            <p>Loading memberships...</p>
                          ) : filteredMemberships.length === 0 ? (
                            <p>No memberships found</p>
                          ) : (
                            filteredMemberships.map((membership) => (
                              <div
                                key={membership.id}
                                onClick={() => handleSelectMembership(membership)}
                                className={`p-4 border rounded-md cursor-pointer transition-colors ${
                                  selectedMembership?.id === membership.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium">{membership.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {membership.description || 'No description'}
                                    </p>
                                    <p className="text-sm mt-2">
                                      <span className="text-muted-foreground">Valid for: </span>
                                      {membership.validity_period} {membership.validity_unit}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      <Badge variant="outline">
                                        {membership.discount_type === 'percentage' ? `${membership.discount_value}% off` : formatPrice(membership.discount_value)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-lg font-semibold">
                                    {formatPrice(membership.discount_value)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
                
                {selectedMembership && (
                  <div className="p-6 mt-auto border-t">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(selectedMembership.discount_value)}</span>
                      </div>
                      
                      {/* Discount section */}
                      <div className="flex justify-between items-center space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <Select value={discountType} onValueChange={(value) => setDiscountType(value as "none" | "percentage" | "fixed")}>
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {discountType !== "none" && (
                          <div className="flex items-center gap-1">
                            <Input 
                              className="w-20 h-8"
                              type="number"
                              value={discountValue}
                              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            />
                            {discountType === "percentage" && <span>%</span>}
                          </div>
                        )}
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="text-muted-foreground">Discount Amount</span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm font-medium pt-1 border-t">
                          <span>Subtotal after discount</span>
                          <span>{formatPrice(subtotalAfterDiscount)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <Select value={selectedTaxRate || "none"} onValueChange={handleTaxRateChange}>
                            <SelectTrigger className="w-[180px] h-8">
                              <SelectValue placeholder="No Tax" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Tax</SelectItem>
                              {taxRates.map((tax) => (
                                <SelectItem key={tax.id} value={tax.id}>
                                  {tax.name} ({tax.percentage}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="text-sm">{formatPrice(taxAmount)}</span>
                      </div>
                      
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total</span>
                        <span>{formatPrice(totalAmount)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Payment Method</label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={handleComplete}
                        disabled={!selectedCustomer || !selectedMembership || isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Pay Now"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center h-full">
                <div className="w-full max-w-md rounded-lg p-6 shadow-sm border text-center bg-background">
                  <div className="mb-4 flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Sale Complete!</h3>
                  <p className="text-muted-foreground mb-6">The membership has been successfully sold and added to the customer's account.</p>
                  
                  <div className="space-y-3 text-left mb-6 p-4 bg-muted/50 rounded-md">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receipt Number:</span>
                      <span className="font-medium">{receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{selectedCustomer?.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Membership:</span>
                      <span className="font-medium">{selectedMembership?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">{formatPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <span className="font-medium capitalize">{paymentMethod}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-4">
                    <Button onClick={handleReset}>
                      Create New Sale
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
