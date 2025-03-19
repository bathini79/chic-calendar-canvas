
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaxRate {
  id: string;
  name: string;
  percentage: number;
  is_default: boolean;
}

interface TaxDefaultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  onSuccess: () => void;
}

export function TaxDefaultsDialog({ isOpen, onClose, locationId, onSuccess }: TaxDefaultsDialogProps) {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [serviceTaxId, setServiceTaxId] = useState<string>('none');
  const [productTaxId, setProductTaxId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTaxRates();
      fetchCurrentTaxSettings();
    }
  }, [isOpen, locationId]);

  const fetchTaxRates = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTaxRates(data || []);
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      toast.error('Failed to load tax rates');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchCurrentTaxSettings = async () => {
    if (!locationId) return;
    
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('location_tax_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();
        
      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }
      
      if (data) {
        setServiceTaxId(data.service_tax_id || 'none');
        setProductTaxId(data.product_tax_id || 'none');
      } else {
        // Set defaults if no data exists
        setServiceTaxId('none');
        setProductTaxId('none');
      }
    } catch (error) {
      console.error('Error fetching location tax settings:', error);
      toast.error('Failed to load current tax settings');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    if (!locationId) return;
    
    try {
      setIsLoading(true);
      
      // Check if a record already exists
      const { data: existingData, error: checkError } = await supabase
        .from('location_tax_settings')
        .select('id')
        .eq('location_id', locationId);
        
      if (checkError) throw checkError;
      
      let saveError;
      
      if (existingData && existingData.length > 0) {
        // Update existing record
        const { error } = await supabase
          .from('location_tax_settings')
          .update({
            service_tax_id: serviceTaxId === 'none' ? null : serviceTaxId,
            product_tax_id: productTaxId === 'none' ? null : productTaxId
          })
          .eq('location_id', locationId);
          
        saveError = error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('location_tax_settings')
          .insert({
            location_id: locationId,
            service_tax_id: serviceTaxId === 'none' ? null : serviceTaxId,
            product_tax_id: productTaxId === 'none' ? null : productTaxId
          });
          
        saveError = error;
      }
      
      if (saveError) throw saveError;
      
      toast.success('Tax defaults updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving tax defaults:', error);
      toast.error('Failed to update tax defaults');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Tax Defaults</DialogTitle>
        </DialogHeader>
        
        {isFetching ? (
          <div className="py-4 text-center">Loading tax settings...</div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-tax">Services Tax</Label>
              <Select
                value={serviceTaxId}
                onValueChange={setServiceTaxId}
              >
                <SelectTrigger id="service-tax">
                  <SelectValue placeholder="Select tax rate for services" />
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
              <p className="text-xs text-muted-foreground">
                This tax will be applied to all services at this location.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-tax">Products Tax</Label>
              <Select
                value={productTaxId}
                onValueChange={setProductTaxId}
              >
                <SelectTrigger id="product-tax">
                  <SelectValue placeholder="Select tax rate for products" />
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
              <p className="text-xs text-muted-foreground">
                This tax will be applied to all products at this location.
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isFetching}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
