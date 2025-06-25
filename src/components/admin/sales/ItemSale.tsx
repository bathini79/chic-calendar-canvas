import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, CheckCircle, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";

interface ItemSaleProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit_of_quantity: string;
  unit_price: number;
  quantity: number;
  category_name?: string;
}

interface CartItem {
  id: string;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  unitOfQuantity: string;
  categoryName?: string;
}

export const ItemSale: React.FC<ItemSaleProps> = ({
  isOpen,
  onClose,
  locationId,
}) => {
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [activeTab, setActiveTab] = useState("items");
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  
  const { taxRates, fetchTaxRates } = useTaxRates();
  const [selectedTaxRate, setSelectedTaxRate] = useState<string | null>(null);
  const [taxRateValue, setTaxRateValue] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Fetch employees for the location
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableItems();
      fetchTaxRates();
      fetchEmployees();
    }
  }, [isOpen, locationId]);

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
    calculateTotals();
  }, [cart, taxRateValue, discountType, discountValue]);

  const fetchEmployees = async () => {
    if (!locationId) return;
    
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .eq("status", "active");
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };
  
  const calculateTotals = () => {
    if (cart.length === 0) {
      setSubtotal(0);
      setTaxAmount(0);
      setTotalAmount(0);
      return;
    }
    
    const originalSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Apply discount if set
    let discountedSubtotal = originalSubtotal;
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      discountAmount = originalSubtotal * (discountValue / 100);
      discountedSubtotal = originalSubtotal - discountAmount;
    } else if (discountType === 'fixed') {
      discountAmount = Math.min(discountValue, originalSubtotal);
      discountedSubtotal = originalSubtotal - discountAmount;
    }
    
    setSubtotal(discountedSubtotal);
    
    // Calculate tax
    const tax = (discountedSubtotal * taxRateValue) / 100;
    setTaxAmount(tax);
    setTotalAmount(discountedSubtotal + tax);
  };
  const fetchAvailableItems = async () => {
    if (!locationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_location_items")
        .select(`
          item_id,
          quantity,
          unit_price,
          inventory_items!inner (
            id,
            name,
            unit_of_quantity
          )
        `)
        .eq("location_id", locationId)
        .eq("status", "active")
        .gt("quantity", 0);

      if (error) throw error;
      
      const items = data?.map(item => ({
        id: item.item_id,
        name: item.inventory_items.name,
        unit_of_quantity: item.inventory_items.unit_of_quantity,
        unit_price: Number(item.unit_price),
        quantity: item.quantity,
        category_name: 'Uncategorized' // TODO: Fetch categories properly in future iteration
      })) || [];
      
      setAvailableItems(items);
    } catch (error: any) {
      toast.error(`Error fetching inventory items: ${error.message}`);
      console.error("Error fetching inventory items:", error);
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
      
      // If still no settings, use default pattern
      if (!settings) {
        const timestamp = new Date().getTime();
        return `ITM-${timestamp}`;
      }
      
      const now = new Date();
      const currentNumber = settings.current_receipt_number || 1;
      
      let receiptNum = settings.prefix || "";
      receiptNum += String(currentNumber).padStart(settings.number_length || 4, "0");
      if (settings.suffix) receiptNum += settings.suffix;
      
      // Update the receipt number
      await supabase
        .from("receipt_settings")
        .update({ current_receipt_number: currentNumber + 1 })
        .eq("id", settings.id);
      
      return receiptNum;
    } catch (error) {
      console.error("Error generating receipt number:", error);
      const timestamp = new Date().getTime();
      return `ITM-${timestamp}`;
    }
  };

  const addToCart = (item: InventoryItem) => {
    const existingCartItem = cart.find(c => c.itemId === item.id);
    
    if (existingCartItem) {
      if (existingCartItem.quantity >= item.quantity) {
        toast.error("Not enough stock available");
        return;
      }
      updateCartQuantity(existingCartItem.id, existingCartItem.quantity + 1);
    } else {
      const newCartItem: CartItem = {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        unitPrice: item.unit_price,
        quantity: 1,
        maxQuantity: item.quantity,
        unitOfQuantity: item.unit_of_quantity,
        categoryName: item.category_name,
      };
      setCart([...cart, newCartItem]);
    }
  };

  const updateCartQuantity = (cartId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === cartId) {
        if (newQuantity > item.maxQuantity) {
          toast.error("Not enough stock available");
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.id !== cartId));
  };

  const processSale = async () => {
    if (!selectedCustomer || cart.length === 0) {
      toast.error("Please select a customer and add items to cart");
      return;
    }

    if (!locationId) {
      toast.error("Location is required");
      return;
    }

    setIsProcessing(true);

    try {
      const newReceiptNumber = await generateReceiptNumber();
      
      // Prepare sales data
      const salesData = cart.map(item => ({
        customer_id: selectedCustomer.id,
        item_id: item.itemId,
        location_id: locationId,
        employee_id: selectedEmployee || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: item.unitPrice * item.quantity,
        tax_rate_id: selectedTaxRate,
        tax_amount: (item.unitPrice * item.quantity * taxRateValue) / 100,
        discount_type: discountType,
        discount_value: discountType === 'none' ? 0 : (discountValue * (item.unitPrice * item.quantity)) / subtotal,
        final_amount: ((item.unitPrice * item.quantity) + ((item.unitPrice * item.quantity * taxRateValue) / 100)) - ((discountType === 'none' ? 0 : (discountValue * (item.unitPrice * item.quantity)) / subtotal)),
        payment_method: paymentMethod,
        notes: notes || null,
        status: 'completed'
      }));

      // Insert sales records
      const { data: salesResult, error: salesError } = await supabase
        .from("item_sales")
        .insert(salesData)
        .select();

      if (salesError) throw salesError;

      // Success
      setReceiptNumber(newReceiptNumber);
      setSaleComplete(true);
      setActiveTab("summary");
      
      toast.success("Item sale processed successfully!");
      
    } catch (error: any) {
      toast.error(`Error processing sale: ${error.message}`);
      console.error("Error processing sale:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setNotes('');
    setSelectedEmployee('');
    setSaleComplete(false);
    setReceiptNumber('');
    setActiveTab("items");
  };

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category_name && item.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Item Sales</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="mb-6">
              <TabsTrigger value="items">Select Items</TabsTrigger>
              <TabsTrigger value="checkout" disabled={cart.length === 0}>
                Checkout {cart.length > 0 && `(${cart.length})`}
              </TabsTrigger>
              <TabsTrigger value="summary" disabled={!saleComplete}>
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="h-full space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Left Column - Customer and Items */}
                <div className="lg:col-span-2 space-y-6">
                  <SelectCustomer
                    selectedCustomer={selectedCustomer}
                    onCustomerSelect={setSelectedCustomer}
                    showCreateForm={showCreateForm}
                    setShowCreateForm={setShowCreateForm}
                  />

                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search items..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <ScrollArea className="h-96">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                          <div className="col-span-2 text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading items...</p>
                          </div>
                        ) : filteredItems.length === 0 ? (
                          <div className="col-span-2 text-center py-8">
                            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">No items available</p>
                          </div>
                        ) : (
                          filteredItems.map((item) => (
                            <div
                              key={item.id}
                              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => addToCart(item)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-gray-900 flex-1">
                                  {item.name}
                                </h3>
                                <Badge variant="outline" className="ml-2">
                                  {item.quantity} {item.unit_of_quantity}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {item.category_name}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-blue-600">
                                  {formatPrice(item.unit_price)}
                                </span>
                                <span className="text-sm text-gray-500">
                                  per {item.unit_of_quantity}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Right Column - Cart */}
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Cart ({cart.length})
                    </h3>
                    
                    {cart.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No items in cart
                      </p>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {cart.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-gray-500">
                                  {formatPrice(item.unitPrice)} per {item.unitOfQuantity}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm px-2">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeFromCart(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    
                    {cart.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between font-semibold">
                          <span>Subtotal:</span>
                          <span>{formatPrice(cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0))}</span>
                        </div>
                        <Button 
                          className="w-full mt-2" 
                          onClick={() => setActiveTab("checkout")}
                          disabled={!selectedCustomer}
                        >
                          Proceed to Checkout
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checkout" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Payment Details */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Payment Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Discount Type</label>
                        <Select value={discountType} onValueChange={(value: 'none' | 'percentage' | 'fixed') => setDiscountType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Discount</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {discountType !== 'none' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Discount Value {discountType === 'percentage' ? '(%)' : '(₹)'}
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Method</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Sold By (Optional)</label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this sale..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="space-y-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Order Summary</h3>
                    
                    <div className="space-y-2 mb-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.name} × {item.quantity}</span>
                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatPrice(cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0))}</span>
                      </div>
                      
                      {discountType !== 'none' && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-{formatPrice(discountType === 'percentage' 
                            ? (cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) * discountValue / 100)
                            : discountValue
                          )}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span>Tax ({taxRateValue}%):</span>
                        <span>{formatPrice(taxAmount)}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{formatPrice(totalAmount)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-6" 
                      onClick={processSale}
                      disabled={isProcessing || !selectedCustomer || cart.length === 0}
                    >
                      {isProcessing ? "Processing..." : "Complete Sale"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary">
              {saleComplete && (
                <SummaryView
                  transactionDetails={{
                    customer: selectedCustomer,
                    totalAmount: totalAmount,
                    paymentMethod: paymentMethod,
                    receiptNumber: receiptNumber,
                    items: cart.map(item => ({
                      name: item.name,
                      quantity: item.quantity,
                      price: item.unitPrice,
                      total: item.unitPrice * item.quantity
                    })),
                    discountAmount: discountType === 'none' ? 0 : 
                      (discountType === 'percentage' 
                        ? (cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) * discountValue / 100)
                        : discountValue),
                    taxAmount: taxAmount,
                    subtotal: subtotal,
                    type: 'item_sale'
                  }}
                  onClose={onClose}
                  onNewTransaction={handleReset}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
