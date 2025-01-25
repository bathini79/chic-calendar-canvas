import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PackageCard } from "./PackageCard";
import { CustomizeDialog } from "./CustomizeDialog";

export function CustomerPackagesGrid() {
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_services (
            service:services (
              id,
              name,
              selling_price,
              duration,
              services_categories (
                categories (
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: allServices } = useQuery({
    queryKey: ['services-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          selling_price,
          duration,
          services_categories (
            categories (
              id,
              name
            )
          )
        `)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: customizeDialogOpen,
  });

  const handleCustomizeOpen = (pkg: any) => {
    setSelectedPackage(pkg);
    const includedServiceIds = pkg.package_services.map((ps: any) => ps.service.id);
    setSelectedServices(includedServiceIds);
    setCustomizeDialogOpen(true);
    calculateTotals(includedServiceIds, pkg);
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    let newSelectedServices;
    if (checked) {
      newSelectedServices = [...selectedServices, serviceId];
    } else {
      const includedServiceIds = selectedPackage.package_services.map((ps: any) => ps.service.id);
      if (includedServiceIds.includes(serviceId)) return;
      newSelectedServices = selectedServices.filter(id => id !== serviceId);
    }
    setSelectedServices(newSelectedServices);
    calculateTotals(newSelectedServices, selectedPackage);
  };

  const calculateTotals = (serviceIds: string[], pkg: any) => {
    const includedServiceIds = pkg.package_services.map((ps: any) => ps.service.id);
    let price = pkg.price;
    let duration = pkg.duration;

    serviceIds.forEach(serviceId => {
      if (!includedServiceIds.includes(serviceId)) {
        const service = allServices?.find(s => s.id === serviceId);
        if (service) {
          price += service.selling_price;
          duration += service.duration;
        }
      }
    });

    setTotalPrice(price);
    setTotalDuration(duration);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages?.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            onCustomize={handleCustomizeOpen}
          />
        ))}
      </div>

      <CustomizeDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        selectedPackage={selectedPackage}
        selectedServices={selectedServices}
        allServices={allServices}
        totalPrice={totalPrice}
        totalDuration={totalDuration}
        onServiceToggle={handleServiceToggle}
      />
    </>
  );
}