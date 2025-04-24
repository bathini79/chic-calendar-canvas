import { useState, useEffect } from 'react';
import { useTaxRates } from '@/hooks/use-tax-rates';
import { useLocationTaxSettings } from '@/hooks/use-location-tax-settings';

interface UseTaxesInCheckoutProps {
  locationId?: string;
  discountedSubtotal: number;
}

export const useTaxesInCheckout = ({ 
  locationId,
  discountedSubtotal 
}: UseTaxesInCheckoutProps) => {
  const { taxRates, fetchTaxRates, isLoading: taxRatesLoading } = useTaxRates();
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const [appliedTaxId, setAppliedTaxId] = useState<string | null>(null);
  const [appliedTaxRate, setAppliedTaxRate] = useState<number>(0);
  const [appliedTaxName, setAppliedTaxName] = useState<string>("");

  useEffect(() => {
    const loadTaxData = async () => {
      await fetchTaxRates();

      if (locationId) {
        const settings = await fetchLocationTaxSettings(locationId);

        if (settings && settings.service_tax_id) {
          setAppliedTaxId(settings.service_tax_id);
        }
      }
    };

    loadTaxData();
  }, [locationId, fetchTaxRates, fetchLocationTaxSettings]);

  useEffect(() => {
    if (appliedTaxId === null || appliedTaxId === "none") {
      setAppliedTaxRate(0);
      setAppliedTaxName("No Tax");
    } else if (appliedTaxId && taxRates.length > 0) {
      const tax = taxRates.find((t) => t.id === appliedTaxId);
      if (tax) {
        setAppliedTaxRate(tax.percentage);
        setAppliedTaxName(tax.name);
      }
    }
  }, [appliedTaxId, taxRates]);

  const handleTaxChange = (taxId: string) => {
    if (taxId === "none") {
      setAppliedTaxId(null); // Ensure backend interprets this as "No Tax"
      setAppliedTaxRate(0);
      setAppliedTaxName("No Tax");
      return;
    }
    const tax = taxRates.find((t) => t.id === taxId);
    if (tax) {
      setAppliedTaxId(taxId);
      setAppliedTaxRate(tax.percentage);
      setAppliedTaxName(tax.name);
    }
  };

  const taxAmount = appliedTaxId ? discountedSubtotal * (appliedTaxRate / 100) : 0;

  return {
    taxRates,
    taxRatesLoading,
    appliedTaxId,
    appliedTaxRate,
    appliedTaxName,
    taxAmount,
    handleTaxChange
  };
};