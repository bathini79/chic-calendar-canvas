
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { format, addMinutes } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useCoupons } from "@/hooks/use-coupons";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function CartSummary() {
  const { 
    items, 
    removeFromCart, 
    selectedDate, 
    selectedTimeSlots,
    getTotalPrice,
    selectedLocation,
    appliedTaxId,
    setAppliedTaxId,
    appliedCouponId,
    setAppliedCouponId
  } = useCart();
  
  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const { taxRates, fetchTaxRates } = useTaxRates();
  const { coupons, fetchCoupons, isLoading: couponsLoading } = useCoupons();
  
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';

  const subtotal = getTotalPrice();
  const afterCouponSubtotal = subtotal - couponDiscount;
  const totalPrice = afterCouponSubtotal + taxAmount;
  const isTimeSelected = Object.keys(selectedTimeSlots).length > 0;
  
  // Load tax data
  useEffect(() => {
    const loadTaxData = async () => {
      await fetchTaxRates();
      
      if (selectedLocation && !appliedTaxId) {
        const settings = await fetchLocationTaxSettings(selectedLocation);
        
        if (settings && settings.service_tax_id) {
          setAppliedTaxId(settings.service_tax_id);
        }
      }
    };
    
    loadTaxData();
  }, [selectedLocation]);

  // Load coupons
  useEffect(() => {
    fetchCoupons();
  }, []);

  // Calculate tax amount whenever appliedTaxId or subtotal changes
  useEffect(() => {
    if (appliedTaxId && taxRates.length > 0) {
      const taxRate = taxRates.find(tax => tax.id === appliedTaxId);
      if (taxRate) {
        setTaxAmount(afterCouponSubtotal * (taxRate.percentage / 100));
      }
    } else {
      setTaxAmount(0);
    }
  }, [appliedTaxId, afterCouponSubtotal, taxRates]);
  
  // Calculate coupon discount
  useEffect(() => {
    if (appliedCouponId && coupons.length > 0) {
      const coupon = coupons.find(c => c.id === appliedCouponId);
      if (coupon) {
        const discount = coupon.discount_type === 'percentage' 
          ? subtotal * (coupon.discount_value / 100)
          : Math.min(coupon.discount_value, subtotal); // Don't discount more than the subtotal
        
        setCouponDiscount(discount);
      }
    } else {
      setCouponDiscount(0);
    }
  }, [appliedCouponId, subtotal, coupons]);
  
  // Sort items by their scheduled start time
  const sortedItems = [...items].sort((a, b) => {
    const aTime = selectedTimeSlots[a.id] || "00:00";
    const bTime = selectedTimeSlots[b.id] || "00:00";
    return aTime.localeCompare(bTime);
  });

  const handleContinue = () => {
    if (isSchedulingPage) {
      if (selectedDate && isTimeSelected) {
        navigate('/booking-confirmation');
      }
    } else {
      navigate('/schedule');
    }
  };

  const handleTaxChange = (taxId: string) => {
    if (taxId === "none") {
      setAppliedTaxId(null);
    } else {
      setAppliedTaxId(taxId);
    }
  };

  const handleCouponChange = (couponId: string) => {
    if (couponId === "none") {
      setAppliedCouponId(null);
    } else {
      setAppliedCouponId(couponId);
    }
  };

  const getSelectedCoupon = () => {
    return coupons.find(c => c.id === appliedCouponId);
  };

  const selectedCoupon = getSelectedCoupon();

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Your Cart ({items.length} items)</h2>
        <p className="text-2xl font-bold mt-2">{formatPrice(totalPrice)}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            sortedItems.map((item) => {
              const itemDuration = item.service?.duration || item.duration || item.package?.duration || 0;
              const itemPrice = item.selling_price || item.service?.selling_price || item.package?.price || 0;
              
              return (
                <div
                  key={item.id}
                  className="flex flex-col space-y-2 p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">
                        {item.service?.name || item.package?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Duration: {itemDuration} min
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(itemPrice)}
                      </p>
                      {isSchedulingPage && selectedTimeSlots[item.id] && selectedDate && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {format(selectedDate, "MMM d")} at {selectedTimeSlots[item.id]} - 
                          {format(
                            addMinutes(
                              new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlots[item.id]}`),
                              itemDuration
                            ),
                            "HH:mm"
                          )}
                        </p>
                      )}
                    </div>
                    {!isSchedulingPage && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          
          {/* Coupon selection */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Coupon</span>
              <Select value={appliedCouponId || "none"} onValueChange={handleCouponChange} disabled={couponsLoading}>
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="No Coupon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Coupon</SelectItem>
                  {coupons.map(coupon => (
                    <SelectItem key={coupon.id} value={coupon.id}>
                      {coupon.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedCoupon && (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit">
                  <span className="text-xs font-medium">
                    {selectedCoupon.discount_type === 'percentage' 
                      ? `${selectedCoupon.discount_value}% off` 
                      : `${formatPrice(selectedCoupon.discount_value)} off`}
                  </span>
                </Badge>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Tax selection */}
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Tax</span>
            <Select value={appliedTaxId || "none"} onValueChange={handleTaxChange}>
              <SelectTrigger className="h-8 w-[150px]">
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
          
          {appliedTaxId && taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Tax Amount
              </span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-base font-medium pt-1">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
        
        <Button 
          className="w-full" 
          onClick={handleContinue}
          disabled={items.length === 0 || (isSchedulingPage && 
            (!selectedDate || !isTimeSelected))}
        >
          {isSchedulingPage ? 'Continue to Booking' : 'Continue to Schedule'}
        </Button>
      </div>
    </Card>
  );
}
