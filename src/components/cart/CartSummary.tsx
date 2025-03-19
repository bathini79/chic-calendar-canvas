
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

export function CartSummary() {
  const { 
    items, 
    removeFromCart, 
    selectedDate, 
    selectedTimeSlots,
    getTotalPrice,
    selectedLocation,
    appliedTaxId,
    setAppliedTaxId
  } = useCart();
  
  const [taxAmount, setTaxAmount] = useState(0);
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const { taxRates, fetchTaxRates } = useTaxRates();
  
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';

  const subtotal = getTotalPrice();
  const totalPrice = subtotal + taxAmount;
  const isTimeSelected = Object.keys(selectedTimeSlots).length > 0;
  
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

  // Calculate tax amount whenever appliedTaxId or subtotal changes
  useEffect(() => {
    if (appliedTaxId && taxRates.length > 0) {
      const taxRate = taxRates.find(tax => tax.id === appliedTaxId);
      if (taxRate) {
        setTaxAmount(subtotal * (taxRate.percentage / 100));
      }
    } else {
      setTaxAmount(0);
    }
  }, [appliedTaxId, subtotal, taxRates]);
  
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
          
          {appliedTaxId && taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Tax
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
