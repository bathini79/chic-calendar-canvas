import { useState, useEffect } from "react";
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
import { calculatePackagePrice, calculatePackageDuration } from "@/pages/admin/bookings/utils/bookingUtils";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LocationSelector } from "@/components/admin/dashboard/LocationSelector";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const locationParam = searchParams.get('location');
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { 
    addToCart, 
    removeFromCart, 
    items, 
    setSelectedLocation, 
    selectedLocation, 
    setAppliedTaxId, 
    setAppliedCouponId,
    clearCart
  } = useCart();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [locationId, setLocationId] = useState<string>(selectedLocation || "all");
  
  const { resetLocationSettings } = useLocationTaxSettings();
  
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) {
        toast.error("Error loading locations");
        throw error;
      }
      return data || [];
    },
  });

  useEffect(() => {
    if (locations && locations.length > 0) {
      if (locationParam && locations.some(loc => loc.id === locationParam)) {
        setLocationId(locationParam);
        setSelectedLocation(locationParam);
      } 
      else if (selectedLocation && locations.some(loc => loc.id === selectedLocation)) {
        setLocationId(selectedLocation);
        setSearchParams(prev => {
          prev.set('location', selectedLocation);
          return prev;
        });
      } 
      else {
        setLocationId(locations[0].id);
        setSelectedLocation(locations[0].id);
        setSearchParams(prev => {
          prev.set('location', locations[0].id);
          return prev;
        });
      }
    }
  }, [locations, locationParam, selectedLocation, setSelectedLocation, setSearchParams]);

  const handleLocationChange = async (value: string) => {
    if (value !== locationId) {
      clearCart();
      
      setLocationId(value);
      setSelectedLocation(value);
      
      setAppliedTaxId(null);
      setAppliedCouponId(null);
      
      setSelectedCategory(null);
      
      setSearchParams(prev => {
        prev.set('location', value);
        return prev;
      });
      
      await resetLocationSettings(value);
      
      await servicesRefetch();
      await packagesRefetch();
      
      toast.success(`Location switched to ${locations?.find(loc => loc.id === value)?.name || 'new location'}`);
    }
  };
  
  const { 
    data: services, 
    isLoading: servicesLoading,
    refetch: servicesRefetch 
  } = useQuery({
    queryKey: ["services", locationId],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select(`
          *,
          services_categories!inner (
            categories (
              id,
              name
            )
          ),
          service_locations!inner (location_id)
        `)
        .eq("status", "active");
      
      if (locationId !== "all") {
        query = query.eq("service_locations.location_id", locationId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        toast.error("Error loading services");
        throw error;
      }
      return data;
    },
    enabled: !!locationId
  });

  const { 
    data: packages, 
    isLoading: packagesLoading,
    refetch: packagesRefetch 
  } = useQuery({
    queryKey: ["packages", locationId],
    queryFn: async () => {
       let query = supabase
              .from('packages')
              .select(`
                *,
                package_services(
                  service:services(*),
                  package_selling_price
                )
              `)
              .eq('status', 'active');
      
            const { data, error } = await query;
            
            if (error) throw error;
            return data;
    },
    enabled: !!locationId
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
    const { data: session } = await supabase.auth.getSession(); // Retrieve session
    const user = session?.session?.user; // Extract user from session
    if (!user) {
      toast.error("You need to log in to book a service or package.");
      navigate("/auth"); // Redirect to the authentication page
      return;
    }
    
    try {
      if (serviceId) {
        const service = services?.find(s => s.id === serviceId);
        if (service) {
          await addToCart(serviceId, undefined, {
            name: service.name,
            price: service.selling_price,
            duration: service.duration,
            selling_price: service.selling_price,
            service: service
          });
        }
      } else if (packageId) {
        const pkg = packages?.find(p => p.id === packageId);
        if (pkg) {
          await addToCart(undefined, packageId, {
            name: pkg.name,
            price: pkg.price,
            duration: calculatePackageDuration(pkg, [], services || []),
            selling_price: pkg.price,
            package: pkg
          });
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    }
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
    
    let price = pkg.price;
    let duration = 0;
    
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

    let price = selectedPackage.price;
    let duration = 0;
    
    selectedPackage.package_services.forEach((ps: any) => {
      duration += ps.service.duration;
    });
    
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
        <div>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="w-full sm:w-[400px]">
              <CategoryFilter
                categories={categories || []}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            </div>
            <div className="w-full sm:w-auto">
              <LocationSelector
                locations={locations || []}
                value={locationId}
                onChange={handleLocationChange}
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
      />

      <MobileCartBar />
    </div>
  );
}
