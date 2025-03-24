
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/components/cart/CartContext";
import { CustomizeDialog } from "@/components/customer/packages/CustomizeDialog";
import { CartSummary } from "@/components/cart/CartSummary";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { CategoryFilter } from "@/components/customer/services/CategoryFilter";
import { ServiceCard } from "@/components/customer/services/ServiceCard";
import { PackageCard } from "@/components/customer/services/PackageCard";

export default function Services() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addToCart, removeFromCart, items } = useCart();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          services_categories!inner (
            categories (
              id,
              name
            )
          )
        `)
        .eq("status", "active");
      
      if (error) {
        toast.error("Error loading services");
        throw error;
      }
      return data;
    },
  });

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          *,
          package_services (
            service:services (
              id,
              name,
              selling_price,
              duration
            ),
            package_selling_price
          )
        `)
        .eq("status", "active");
      if (error) {
        toast.error("Error loading packages");
        throw error;
      }
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) {
        toast.error("Error loading categories");
        throw error;
      }
      return data;
    },
  });

  const handleBookNow = async (serviceId?: string, packageId?: string) => {
    if (serviceId) {
      const service = services?.find(s => s.id === serviceId);
      if (service) {
        await addToCart(serviceId, undefined, { 
          service,
          name: service.name,
          duration: service.duration,
          selling_price: service.selling_price,
          price: service.selling_price
        });
      }
    } else if (packageId) {
      const pkg = packages?.find(p => p.id === packageId);
      if (pkg) {
        await addToCart(undefined, packageId, { 
          package: pkg,
          name: pkg.name,
          duration: pkg.duration,
          price: pkg.price
        });
      }
    }
  };

  const handleAddCustomPackage = async () => {
    if (!selectedPackage) return;
    
    // Get base included services
    const baseServiceIds = selectedPackage.package_services.map((ps: any) => ps.service.id);
    
    // Find additional services (not in the base package)
    const customizedServiceIds = selectedServices.filter(
      id => !baseServiceIds.includes(id)
    );
    
    await addToCart(undefined, selectedPackage.id, {
      package: selectedPackage,
      name: selectedPackage.name,
      price: totalPrice,
      duration: totalDuration,
      customized_services: customizedServiceIds
    });
    
    // Close the dialog after adding to cart
    setCustomizeDialogOpen(false);
  };

  const handleRemove = async (serviceId?: string, packageId?: string) => {
    const itemToRemove = items.find(item => 
      (serviceId && item.service_id === serviceId) || 
      (packageId && item.package_id === packageId)
    );
    if (itemToRemove) {
      await removeFromCart(itemToRemove.id);
    }
  };

  const isItemInCart = (serviceId?: string, packageId?: string) => {
    return items.some(item => 
      (serviceId && item.service_id === serviceId) || 
      (packageId && item.package_id === packageId)
    );
  };

  const handleCustomize = (pkg: any) => {
    setSelectedPackage(pkg);
    const includedServiceIds = pkg.package_services.map((ps: any) => ps.service.id);
    setSelectedServices(includedServiceIds);
    setCustomizeDialogOpen(true);
    
    // Calculate initial totals
    let price = pkg.price;
    let duration = 0;
    
    // Calculate duration and price using package_selling_price when available
    pkg.package_services.forEach((ps: any) => {
      duration += ps.service.duration;
    });
    
    setTotalPrice(price);
    setTotalDuration(duration);
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

    // Recalculate totals
    let price = selectedPackage.price;
    let duration = 0;
    
    // First, add all base package services duration
    selectedPackage.package_services.forEach((ps: any) => {
      duration += ps.service.duration;
    });
    
    // Then add any additional custom services
    newSelectedServices.forEach(id => {
      const service = services?.find(s => s.id === id);
      const isInBasePackage = selectedPackage.package_services.some((ps: any) => ps.service.id === id);
      
      if (service && !isInBasePackage) {
        price += service.selling_price;
        duration += service.duration;
      }
    });
    
    setTotalPrice(price);
    setTotalDuration(duration);
  };

  const filteredServices = services?.filter((service) => {
    const matchesCategory = !selectedCategory || 
      service.services_categories.some(
        (sc: any) => sc.categories.id === selectedCategory
      );
    return matchesCategory;
  });

  if (servicesLoading || packagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        <div >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-[400px]">
              <CategoryFilter
                categories={categories || []}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages?.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isInCart={isItemInCart(undefined, pkg.id)}
                onBookNow={(packageId) => handleBookNow(undefined, packageId)}
                onRemove={(packageId) => handleRemove(undefined, packageId)}
                onCustomize={handleCustomize}
              />
            ))}

            {filteredServices?.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isInCart={isItemInCart(service.id)}
                onBookNow={(serviceId) => handleBookNow(serviceId)}
                onRemove={(serviceId) => handleRemove(serviceId)}
              />
            ))}
          </div>

          {(!filteredServices || filteredServices.length === 0) && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No services found matching your criteria.</p>
            </div>
          )}
        </div>

        <div className="hidden lg:block sticky top-24 h-[calc(100vh-6rem)]">
          <CartSummary />
        </div>
      </div>

      <CustomizeDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        selectedPackage={selectedPackage}
        selectedServices={selectedServices}
        allServices={services}
        totalPrice={totalPrice}
        totalDuration={totalDuration}
        onServiceToggle={handleServiceToggle}
        onConfirm={handleAddCustomPackage}
      />

      <MobileCartBar />
    </div>
  );
}
