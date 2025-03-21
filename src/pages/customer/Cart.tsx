
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

type TaxRate = {
  id: string;
  name: string;
  percentage: number;
};

export default function Cart() {
  const { items, getTotalPrice, selectedLocation } = useCart();
  const [appliedTaxId, setAppliedTaxId] = useState<string | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const { fetchTaxRates } = useTaxRates();
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  
  const subtotal = getTotalPrice();
  const taxAmount = selectedTaxRate ? (subtotal * selectedTaxRate.percentage / 100) : 0;
  const total = subtotal + taxAmount;

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
    </div>
  );
}
