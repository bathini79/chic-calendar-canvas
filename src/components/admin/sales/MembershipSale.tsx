import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Tag, CheckCircle, ShoppingCart, Package } from "lucide-react";
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
import { SummaryView } from "@/pages/admin/bookings/components/SummaryView";

interface InventoryItem {
  id: string;
  name: string;
  unit_of_quantity: string;
  location_items: {
    id: string;
    quantity: number;
    unit_price: number;
    location_id: string;
  }[];
}

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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [activeTab, setActiveTab] = useState("memberships");
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  
  const { taxRates, fetchTaxRates } = useTaxRates();
  const [selectedTaxRate, setSelectedTaxRate] = useState<string | null>(null);
  const [taxRateValue, setTaxRateValue] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  useEffect(() => {
    fetchMemberships();
    fetchInventoryItems();
    fetchTaxRates();
  }, [locationId]);
  
  useEffect(() => {
    if (taxRates.length > 0) {
      // Find default tax rate
      const defaultTax = taxRates.find(tax => tax.is_default);
      if (defaultTax) {
        setSelectedTaxRate(defaultTax.id);
        setTaxRateValue(defaultTax.percentage);
      } else if (taxRates[0]) {
        setSelectedTaxRate(taxRates[0].id);
        setTaxRateValue(taxRates[0].percentage);
      }
    }
  }, [taxRates]);
    useEffect(() => {
    if (selectedMembership || selectedItem) {
      calculateTotals();
    }
  }, [selectedMembership, selectedItem, itemQuantity, taxRateValue, discountType, discountValue]);
    const calculateTotals = () => {
    let originalSubtotal = 0;
    
    if (selectedMembership) {
      originalSubtotal = selectedMembership.discount_value;
    } else if (selectedItem && selectedItem.location_items.length > 0) {
      originalSubtotal = selectedItem.location_items[0].unit_price * itemQuantity;
    } else {
      return;
    }
    
    // Apply discount if set
    let discountedSubtotal = originalSubtotal;
    if (discountType === 'percentage') {
      discountedSubtotal = originalSubtotal * (1 - (discountValue / 100));
    } else if (discountType === 'fixed') {
      discountedSubtotal = Math.max(0, originalSubtotal - discountValue);
    }
    
    setSubtotal(discountedSubtotal);
    
    // Calculate tax
    const tax = (discountedSubtotal * taxRateValue) / 100;
    setTaxAmount(tax);
    setTotalAmount(discountedSubtotal + tax);
  };

  const fetchInventoryItems = async () => {
    if (!locationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          id,
          name,
          unit_of_quantity,
          location_items:inventory_location_items!inner (
            id,
            quantity,
            unit_price,
            location_id
          )
        `)
        .eq("location_items.location_id", locationId)
        .eq("location_items.status", "active")
        .gt("location_items.quantity", 0);

      if (error) throw error;
      
      setInventoryItems(data || []);
    } catch (error: any) {
      toast.error(`Error fetching inventory items: ${error.message}`);
      console.error("Error fetching inventory items:", error);
    } finally {
      setIsLoading(false);
    }
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
      let settings = null;
      
      // Get receipt settings for the location
      if (locationId) {
        const { data, error } = await supabase
          .from("receipt_settings")
          .select("*")
          .eq("location_id", locationId);
        
        if (!error && data && data.length > 0) {
          settings = data[0];
        }
      }
      
      // If no location-specific settings, get global settings
      if (!settings) {
        const { data, error } = await supabase
          .from("receipt_settings")
          .select("*")
          .is("location_id", null);
          
        if (!error && data && data.length > 0) {
          settings = data[0];
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
    
    if (!selectedMembership && !selectedItem) {
      toast.error("Please select a membership or item");
      return;
    }
    
    if (selectedItem && itemQuantity > (selectedItem.location_items[0]?.quantity || 0)) {
      toast.error("Insufficient stock available");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const receipt = await generateReceiptNumber();
      setReceiptNumber(receipt);
      
      if (selectedMembership) {
        // Handle membership sale
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
            amount: subtotal, // Use the discounted subtotal
            tax_amount: taxAmount,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            tax_rate_id: selectedTaxRate,
            location_id: locationId || null,
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
      } else if (selectedItem) {
        // Handle item sale
        const { data: itemSaleData, error: itemSaleError } = await supabase
          .from("item_sales")
          .insert({
            customer_id: selectedCustomer.id,
            item_id: selectedItem.id,
            location_id: locationId || selectedItem.location_items[0].location_id,
            employee_id: null, // Could be added later if needed
            quantity: itemQuantity,
            unit_price: selectedItem.location_items[0].unit_price,
            total_amount: (selectedItem.location_items[0].unit_price * itemQuantity),
            tax_rate_id: selectedTaxRate,
            tax_amount: taxAmount,
            discount_type: discountType,
            discount_value: discountType === 'none' ? 0 : discountValue,
            final_amount: totalAmount,
            payment_method: paymentMethod,
            status: "completed"
          })
          .select()
          .single();
          
        if (itemSaleError) throw itemSaleError;
        
        // Create transaction record for item sale
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            customer_id: selectedCustomer.id,
            amount: totalAmount,
            tax_amount: taxAmount,
            payment_method: paymentMethod,
            transaction_type: "item_sale",
            item_id: selectedItem.id,
            item_type: "inventory_item"
          });
          
        if (transactionError) throw transactionError;
        
        toast.success("Item sale completed");
      }
      
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
      return;
    }
    
    setSelectedTaxRate(taxId);
    const tax = taxRates.find(t => t.id === taxId);
    if (tax) {
      setTaxRateValue(tax.percentage);
    }
  };
    const handleSelectMembership = (membership: Membership) => {
    setSelectedMembership(membership);
    setSelectedItem(null); // Clear item selection
    setSubtotal(membership.discount_value);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSelectedMembership(null); // Clear membership selection
    setItemQuantity(1); // Reset quantity
  };
    const handleReset = () => {
    setSelectedMembership(null);
    setSelectedItem(null);
    setItemQuantity(1);
    setSelectedCustomer(null);
    setShowCreateForm(false);
    setSaleComplete(false);
    setReceiptNumber("");
    setPaymentMethod("cash");
    setSearchTerm("");
    setDiscountType('none');
    setDiscountValue(0);
  };
    const filteredMemberships = memberships.filter(membership => 
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (membership.description && membership.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredInventoryItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (saleComplete && selectedMembership && selectedCustomer) {
    return (
      <div
        className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SummaryView
          customer={{
            id: selectedCustomer.id,
            full_name: selectedCustomer.full_name || "",
            email: selectedCustomer.email || "",
            phone_number: selectedCustomer.phone_number || ""
          }}          totalPrice={totalAmount}
          items={selectedMembership ? [{
            id: selectedMembership.id,
            name: selectedMembership.name,
            price: subtotal,
            type: "membership"
          }] : selectedItem ? [{
            id: selectedItem.id,
            name: `${selectedItem.name} (x${itemQuantity})`,
            price: subtotal,
            type: "inventory_item"
          }] : []}
          paymentMethod={paymentMethod === "card" ? "card" : paymentMethod as 'cash' | 'card' | 'online'}
          onAddAnother={handleReset}
          receiptNumber={receiptNumber}
          taxAmount={taxAmount}
          subTotal={subtotal}
          membershipName={selectedMembership?.name}
          membershipDiscount={selectedMembership?.discount_value}
        />
      </div>
    );
  }

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
            <div className="p-6 border-b">
              <Tabs value={activeTab} onValueChange={setActiveTab}>                <TabsList className="mb-4">
                  <TabsTrigger value="memberships" className="flex items-center gap-1">
                    <Tag size={16} />
                    <span>Memberships</span>
                  </TabsTrigger>
                  <TabsTrigger value="items" className="flex items-center gap-1">
                    <Package size={16} />
                    <span>Items</span>
                  </TabsTrigger>
                </TabsList>
                  <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                      placeholder={`Search ${activeTab}...`} 
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
                    </div>                  </ScrollArea>
                </TabsContent>

                <TabsContent value="items" className="m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {isLoading ? (
                        <p>Loading items...</p>
                      ) : filteredInventoryItems.length === 0 ? (
                        <p>No items found</p>
                      ) : (
                        filteredInventoryItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className={`p-4 border rounded-md cursor-pointer transition-colors ${
                              selectedItem?.id === item.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  <span className="text-muted-foreground">Available: </span>
                                  {item.location_items[0]?.quantity || 0} {item.unit_of_quantity}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <Badge variant="outline">
                                    In Stock
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-lg font-semibold">
                                {formatPrice(item.location_items[0]?.unit_price || 0)} per {item.unit_of_quantity}
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
              {(selectedMembership || selectedItem) && (
              <div className="p-6 mt-auto border-t">
                {selectedItem && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Selected Item</h4>
                    <div className="flex justify-between items-center">
                      <span>{selectedItem.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Qty:</span>
                        <Input
                          type="number"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(Math.max(1, Math.min(Number(e.target.value), selectedItem.location_items[0]?.quantity || 0)))}
                          className="w-16 h-8"
                          min={1}
                          max={selectedItem.location_items[0]?.quantity || 0}
                        />
                        <span className="text-sm text-muted-foreground">of {selectedItem.location_items[0]?.quantity || 0} available</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      {selectedMembership 
                        ? formatPrice(selectedMembership.discount_value)
                        : selectedItem 
                        ? formatPrice((selectedItem.location_items[0]?.unit_price || 0) * itemQuantity)
                        : formatPrice(0)
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'none' | 'percentage' | 'fixed')}>
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue placeholder="Discount" />
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
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          className="w-20 h-8"
                          min={0}
                          max={discountType === 'percentage' ? 100 : undefined}
                        />
                      )}
                    </div>
                    {discountType !== 'none' && (
                      <span className="text-sm text-green-600">
                        -{formatPrice(selectedMembership.discount_value - subtotal)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <Select value={selectedTaxRate || "none"} onValueChange={handleTaxRateChange}>
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="No tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tax</SelectItem>
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
          </div>
        </div>
      </div>
    </div>
  );
};
