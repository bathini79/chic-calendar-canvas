
import { useEffect, useState } from "react";
import { ServiceCard } from "@/components/customer/services/ServiceCard";
import { PackageCard } from "@/components/customer/services/PackageCard";
import { supabase } from "@/integrations/supabase/client";
import { CategoryFilter } from "@/components/customer/services/CategoryFilter";
import { useCart } from "@/components/cart/CartContext";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  original_price: number;
  selling_price: number;
  image_urls: string[];
  category_id: string;
  services_categories: Array<{ category: { id: string; name: string } }>;
}

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  image_urls: string[];
  is_active: boolean;
  categories: string[];
  package_services: Array<{
    service: Service;
    package_selling_price: number;
  }>;
  package_locations: Array<{ location_id: string }>;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const { addToCart, selectedLocation, setSelectedLocation } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchServices();
      fetchPackages();
    }
  }, [selectedLocation, selectedCategoryId]);

  async function fetchServices() {
    setIsLoading(true);
    try {
      let query = supabase
        .from("services")
        .select(`
          *,
          services_categories(
            category:categories(id, name)
          )
        `)
        .eq("status", "active");

      if (selectedCategoryId !== "all") {
        query = query.contains("categories", [selectedCategoryId]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter services to only show those that have a service_locations entry
      // with the selected location, or show all if no location is selected
      if (selectedLocation) {
        const { data: serviceLocations } = await supabase
          .from("service_locations")
          .select("service_id")
          .eq("location_id", selectedLocation);

        if (serviceLocations) {
          const serviceIds = serviceLocations.map(sl => sl.service_id);
          setServices(data.filter(service => serviceIds.includes(service.id)));
        } else {
          setServices(data);
        }
      } else {
        setServices(data);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPackages() {
    try {
      let query = supabase
        .from("packages")
        .select(`
          *,
          package_services(
            service:services(*),
            package_selling_price
          ),
          package_locations(location_id)
        `)
        .eq("status", "active");

      if (selectedCategoryId !== "all") {
        query = query.contains("categories", [selectedCategoryId]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter packages to only show those that have a package_locations entry
      // with the selected location, or show all if no location is selected
      if (selectedLocation) {
        setPackages(
          data.filter(pkg => 
            pkg.package_locations.some(loc => loc.location_id === selectedLocation)
          )
        );
      } else {
        setPackages(data);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function fetchLocations() {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setLocations(data);
      
      // If location is already selected in cart but there's no data yet, fetch it now
      if (selectedLocation && !isLoading && services.length === 0) {
        fetchServices();
        fetchPackages();
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  }

  function handleAddServiceToCart(service: Service) {
    addToCart(service.id, undefined, {
      service,
      selling_price: service.selling_price,
      duration: service.duration
    });
  }

  function handleAddPackageToCart(pkg: Package) {
    addToCart(undefined, pkg.id, {
      package: pkg,
      selling_price: pkg.price,
      duration: pkg.duration
    });
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Our Services</h1>

      <div className="flex flex-col md:flex-row mb-6 gap-4">
        <div className="w-full md:w-1/2 space-y-2">
          <Label htmlFor="location-select">Select Location</Label>
          <Select
            value={selectedLocation || ""}
            onValueChange={(value) => setSelectedLocation(value)}
          >
            <SelectTrigger id="location-select">
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-1/2">
          <Label htmlFor="search" className="mb-2 block">
            Search Services
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name or description..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {!selectedLocation ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium mb-2">Please select a location</h3>
          <p className="text-muted-foreground">
            Select a salon location to view available services and packages
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse">Loading services...</div>
        </div>
      ) : (
        <>
          {filteredServices.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onAddToCart={() => handleAddServiceToCart(service)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredServices.length > 0 && filteredPackages.length > 0 && (
            <Separator className="my-8" />
          )}

          {filteredPackages.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    package={pkg}
                    onAddToCart={() => handleAddPackageToCart(pkg)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredServices.length === 0 && filteredPackages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium mb-2">No services found</h3>
              <p className="text-muted-foreground">
                Try selecting a different category or adjusting your search
              </p>
            </div>
          )}
        </>
      )}

      {isMobile && <MobileCartBar />}
    </div>
  );
}
