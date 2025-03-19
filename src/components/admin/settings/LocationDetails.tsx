
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, MapPin, Phone, Mail, Clock, TagIcon } from "lucide-react";
import { LocationDialog } from "./LocationDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TaxDefaultsDialog } from "./TaxDefaultsDialog";

interface LocationDetailsProps {
  location: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    phone: string;
    email: string;
    status: "active" | "inactive";
  };
  onUpdate: () => void;
  onDelete: (id: string) => void;
}

interface TaxSettings {
  service_tax_id: string | null;
  product_tax_id: string | null;
}

interface TaxRate {
  id: string;
  name: string;
  percentage: number;
}

export function LocationDetails({ location, onUpdate, onDelete }: LocationDetailsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    service_tax_id: null,
    product_tax_id: null
  });
  const [serviceTax, setServiceTax] = useState<TaxRate | null>(null);
  const [productTax, setProductTax] = useState<TaxRate | null>(null);

  useEffect(() => {
    fetchTaxSettings();
  }, [location.id]);

  const fetchTaxSettings = async () => {
    try {
      // Fetch the location tax settings
      const { data: taxSettingsData, error: taxSettingsError } = await supabase
        .from('location_tax_settings')
        .select('*')
        .eq('location_id', location.id)
        .single();
      
      if (taxSettingsError && taxSettingsError.code !== 'PGRST116') {
        throw taxSettingsError;
      }
      
      if (taxSettingsData) {
        setTaxSettings({
          service_tax_id: taxSettingsData.service_tax_id,
          product_tax_id: taxSettingsData.product_tax_id
        });
        
        // Fetch the service tax details if a tax ID is set
        if (taxSettingsData.service_tax_id) {
          const { data: serviceTaxData, error: serviceTaxError } = await supabase
            .from('tax_rates')
            .select('*')
            .eq('id', taxSettingsData.service_tax_id)
            .single();
            
          if (serviceTaxError) throw serviceTaxError;
          if (serviceTaxData) setServiceTax(serviceTaxData);
        }
        
        // Fetch the product tax details if a tax ID is set
        if (taxSettingsData.product_tax_id) {
          const { data: productTaxData, error: productTaxError } = await supabase
            .from('tax_rates')
            .select('*')
            .eq('id', taxSettingsData.product_tax_id)
            .single();
            
          if (productTaxError) throw productTaxError;
          if (productTaxData) setProductTax(productTaxData);
        }
      } else {
        setTaxSettings({ service_tax_id: null, product_tax_id: null });
        setServiceTax(null);
        setProductTax(null);
      }
    } catch (error) {
      console.error("Error fetching tax settings:", error);
      toast.error("Failed to load tax settings");
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${location.name}?`)) {
      onDelete(location.id);
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row justify-between items-start">
          <div>
            <CardTitle className="text-xl">{location.name}</CardTitle>
            <Badge variant={location.status === "active" ? "default" : "secondary"} className="mt-1">
              {location.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm pb-2">
          {location.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>{location.address}</p>
                <p>
                  {location.city}
                  {location.state && `, ${location.state}`} {location.zip_code}
                </p>
                <p>{location.country}</p>
              </div>
            </div>
          )}
          {location.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{location.phone}</span>
            </div>
          )}
          {location.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{location.email}</span>
            </div>
          )}
          {/* Hours section would go here */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Hours: Not configured</span>
          </div>
          <div className="flex items-start gap-2">
            <TagIcon className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="flex justify-between items-center">
                <p className="font-medium">Tax Settings</p>
                <Button variant="ghost" size="sm" onClick={() => setIsTaxDialogOpen(true)}>
                  Edit
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Services: {serviceTax ? `${serviceTax.name} (${serviceTax.percentage}%)` : "No tax"}</p>
                <p>Products: {productTax ? `${productTax.name} (${productTax.percentage}%)` : "No tax"}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {/* Additional footer content can go here */}
        </CardFooter>
      </Card>

      <LocationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        location={location}
        onSuccess={() => {
          onUpdate();
          setIsDialogOpen(false);
        }}
      />

      <TaxDefaultsDialog
        isOpen={isTaxDialogOpen}
        onClose={() => setIsTaxDialogOpen(false)}
        locationId={location.id}
        onSuccess={() => {
          fetchTaxSettings();
          onUpdate();
        }}
      />
    </>
  );
}
