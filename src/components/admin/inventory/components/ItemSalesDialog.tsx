import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  MapPin, 
  Calculator,
  Minus,
  Plus,
  Trash2
} from 'lucide-react';

interface ItemSalesDialogProps {
  open: boolean;
  onClose: () => void;
  locationId?: string;
}

interface CartItem {
  id: string;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
  unitOfQuantity: string;
}

interface ItemSale {
  customer_id: string;
  item_id: string;
  location_id: string;
  employee_id?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_rate_id?: string;
  tax_amount: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  final_amount: number;
  payment_method: string;
  notes?: string;
}

export function ItemSalesDialog({ open, onClose, locationId }: ItemSalesDialogProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>(locationId || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch available inventory items for selected location
  const { data: availableItems = [] } = useQuery({
    queryKey: ['available-inventory', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      
      const { data, error } = await supabase
        .from('inventory_location_items')
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
        .eq('location_id', selectedLocation)
        .eq('status', 'active')
        .gt('quantity', 0);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLocation,
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_enabled', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const discountAmount = discountType === 'percentage' 
    ? subtotal * (discountValue / 100)
    : discountType === 'fixed' 
    ? Math.min(discountValue, subtotal)
    : 0;
  const finalAmount = subtotal - discountAmount;

  // Add item to cart
  const addToCart = (itemId: string) => {
    const item = availableItems.find(i => i.item_id === itemId);
    if (!item) return;

    const existingCartItem = cart.find(c => c.itemId === itemId);
    if (existingCartItem) {
      if (existingCartItem.quantity >= item.quantity) {
        toast.error('Not enough stock available');
        return;
      }
      setCart(cart.map(c => 
        c.itemId === itemId 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      const newCartItem: CartItem = {
        id: crypto.randomUUID(),
        itemId: item.item_id,
        name: item.inventory_items.name,
        unitPrice: Number(item.unit_price),
        quantity: 1,
        availableQuantity: item.quantity,
        unitOfQuantity: item.inventory_items.unit_of_quantity,
      };
      setCart([...cart, newCartItem]);
    }
  };

  // Update cart item quantity
  const updateCartItemQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
      return;
    }

    const cartItem = cart.find(c => c.id === cartId);
    if (!cartItem) return;

    if (quantity > cartItem.availableQuantity) {
      toast.error('Not enough stock available');
      return;
    }

    setCart(cart.map(c => 
      c.id === cartId 
        ? { ...c, quantity }
        : c
    ));
  };

  // Remove item from cart
  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => c.id !== cartId));
  };

  // Process sale mutation
  const processSaleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || !selectedLocation || cart.length === 0) {
        throw new Error('Please fill all required fields and add items to cart');
      }

      const sales: ItemSale[] = cart.map(item => ({
        customer_id: selectedCustomer,
        item_id: item.itemId,
        location_id: selectedLocation,
        employee_id: selectedEmployee || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: item.unitPrice * item.quantity,
        tax_rate_id: null, // TODO: Add tax rate selection
        tax_amount: 0, // TODO: Calculate tax
        discount_type: discountType,
        discount_value: discountType === 'none' ? 0 : (discountAmount * (item.unitPrice * item.quantity) / subtotal),
        final_amount: (item.unitPrice * item.quantity) - (discountAmount * (item.unitPrice * item.quantity) / subtotal),
        payment_method: paymentMethod,
        notes: notes || null,
      }));

      // Insert all sales
      const { data, error } = await supabase
        .from('item_sales')
        .insert(sales)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Sale processed successfully!');
      queryClient.invalidateQueries({ queryKey: ['available-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to process sale: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedCustomer('');
    setSelectedEmployee('');
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setNotes('');
  };

  const handleProcessSale = () => {
    setIsProcessing(true);
    processSaleMutation.mutate();
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Point of Sale - Inventory Items
          </DialogTitle>
          <DialogDescription>
            Sell inventory items directly to customers
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Selection and Cart */}
          <div className="space-y-6">
            {/* Customer and Location Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sale Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.full_name} ({customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="employee">Employee (Optional)</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Available Items */}
            {selectedLocation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Available Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {availableItems.map((item) => (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => addToCart(item.item_id)}
                      >
                        <div>
                          <p className="font-medium">{item.inventory_items.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{Number(item.unit_price).toFixed(2)} per {item.inventory_items.unit_of_quantity}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {item.quantity} {item.inventory_items.unit_of_quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Cart and Payment */}
          <div className="space-y-6">
            {/* Shopping Cart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Shopping Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No items in cart
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{item.unitPrice.toFixed(2)} per {item.unitOfQuantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="min-w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
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
                )}
              </CardContent>
            </Card>

            {/* Discount and Payment */}
            {cart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Discount */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Discount Type</Label>
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
                        <Label>Discount Value</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          placeholder={discountType === 'percentage' ? '0-100' : '0.00'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.name}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this sale..."
                      rows={2}
                    />
                  </div>

                  {/* Total Summary */}
                  <div className="border-t pt-4">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-1">
                        <span>Total:</span>
                        <span>₹{finalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Process Sale Button */}
                  <Button
                    className="w-full"
                    onClick={handleProcessSale}
                    disabled={!selectedCustomer || !selectedLocation || cart.length === 0 || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Process Sale'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
