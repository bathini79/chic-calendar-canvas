
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/components/cart/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCoupons, Coupon } from "@/hooks/use-coupons";
import { CouponDebugger } from "@/components/debug/CouponDebugger";

type TaxRate = {
  id: string;
  name: string;
  percentage: number;
};

export default function Cart() {
  const { items, getTotalPrice, selectedLocation, appliedTaxId, setAppliedTaxId, appliedCouponId, setAppliedCouponId } = useCart();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const { fetchTaxRates } = useTaxRates();
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const { coupons, isLoading: isLoadingCoupons, getCouponById } = useCoupons();
  
  const subtotal = getTotalPrice();
  const couponDiscount = selectedCoupon ? (
    selectedCoupon.discount_type === 'percentage' 
      ? (subtotal * selectedCoupon.discount_value / 100)
      : Math.min(selectedCoupon.discount_value, subtotal)
  ) : 0;
  const discountedSubtotal = subtotal - couponDiscount;
  const taxAmount = selectedTaxRate ? (discountedSubtotal * selectedTaxRate.percentage / 100) : 0;
  const total = discountedSubtotal + taxAmount;

  // Fetch tax rates and default tax settings
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch all tax rates
        const taxRatesData = await fetchTaxRates();
        setTaxRates(taxRatesData || []);
        
        // If location is selected, check for default tax settings
        if (selectedLocation) {
          const settings = await fetchLocationTaxSettings(selectedLocation);
          
          if (settings && settings.service_tax_id) {
            // Apply service tax by default (we can make this configurable)
            setAppliedTaxId(settings.service_tax_id);
            
            // Find the tax rate details from our list
            const defaultTax = taxRatesData.find(tax => tax.id === settings.service_tax_id);
            if (defaultTax) {
              setSelectedTaxRate(defaultTax);
            }
          }
        }
      } catch (error) {
        console.error("Error loading tax data:", error);
        toast.error("Failed to load tax information");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedLocation]);

  // Load coupon data when appliedCouponId changes
  useEffect(() => {
    const loadCouponData = async () => {
      if (!appliedCouponId) {
        setSelectedCoupon(null);
        return;
      }

      try {
        // Try from cache first (coupons array)
        const couponFromCache = coupons.find(c => c.id === appliedCouponId);
        if (couponFromCache) {
          setSelectedCoupon(couponFromCache);
          return;
        }

        // If not in cache, try to get it from the database
        const coupon = await getCouponById(appliedCouponId);
        if (coupon) {
          setSelectedCoupon(coupon);
        } else {
          setSelectedCoupon(null);
        }
      } catch (error) {
        console.error("Error loading coupon data:", error);
        setSelectedCoupon(null);
      }
    };

    loadCouponData();
  }, [appliedCouponId, coupons, getCouponById]);

  const handleTaxChange = (taxId: string) => {
    if (taxId === "none") {
      setAppliedTaxId(null);
      setSelectedTaxRate(null);
      return;
    }
    
    setAppliedTaxId(taxId);
    const taxRate = taxRates.find(tax => tax.id === taxId);
    if (taxRate) {
      setSelectedTaxRate(taxRate);
    }
  };
  
  const handleCouponChange = (couponId: string) => {
    if (couponId === "none") {
      setAppliedCouponId(null);
      return;
    }
    
    setAppliedCouponId(couponId);
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>{items.length > 0 ? "Your Items" : "Your Cart is Empty"}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-muted-foreground">
                  Add some services or packages to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-4">
                      <div>
                        <h3 className="font-medium">{item.service?.name || item.package?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Duration: {item.service?.duration || item.package?.duration || 0} min
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.selling_price || item.service?.selling_price || item.package?.price || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  
                  {/* Coupon selection */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="coupon-selection">Coupon</Label>
                    <Select
                      value={appliedCouponId || "none"}
                      onValueChange={handleCouponChange}
                      disabled={isLoadingCoupons}
                    >
                      <SelectTrigger id="coupon-selection">
                        <SelectValue placeholder="Select coupon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Coupon</SelectItem>
                        {coupons.map((coupon) => (
                          <SelectItem key={coupon.id} value={coupon.id}>
                            {coupon.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="text-muted-foreground">
                        {selectedCoupon.code} ({selectedCoupon.discount_type === 'percentage' 
                          ? `${selectedCoupon.discount_value}%` 
                          : formatPrice(selectedCoupon.discount_value)})
                      </span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  
                  {/* Tax selection */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="tax-selection">Tax</Label>
                    <Select
                      value={appliedTaxId || "none"}
                      onValueChange={handleTaxChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="tax-selection">
                        <SelectValue placeholder="Select tax rate" />
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
                  
                  {selectedTaxRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {selectedTaxRate.name} ({selectedTaxRate.percentage}%)
                      </span>
                      <span>{formatPrice(taxAmount)}</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                
                <Button className="w-full" disabled={items.length === 0}>
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Debugging section */}
      {process.env.NODE_ENV !== 'production' && <CouponDebugger />}
    </div>
  );
}
