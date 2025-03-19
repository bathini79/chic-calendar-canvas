
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Search, ShoppingCart, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/components/cart/CartContext';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  selling_price: number;
  original_price: number;
  category_id: string;
  image_urls: string[];
  status: 'active' | 'inactive' | 'archived';
  gender: string;
  created_at: string;
  updated_at: string;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_percentage: number;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  services: Service[];
  status: 'active' | 'inactive' | 'archived';
  is_customizable: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string) => void;
  selectedServices?: string[];
  selectedPackages?: string[];
  isBookingFlow?: boolean;
  items?: any[];
  selectedStylists?: Record<string, string>;
  onStylistSelect?: (serviceId: string, stylistId: string) => void;
  locationId?: string;
}

interface CartItem {
  id: string;
  type: 'service' | 'package';
  package?: ServicePackage;
  service?: Service;
  price: number;
  cartItemId?: string;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  onServiceSelect,
  onPackageSelect,
  selectedServices = [],
  selectedPackages = [],
  isBookingFlow = false,
  items = [],
  selectedStylists = {},
  onStylistSelect,
  locationId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('services');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { items: cartItems, addItem } = useCart();

  // Fetch services
  const { data: services = [], isLoading: isServicesLoading } = useQuery({
    queryKey: ['services', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (locationId) {
        // Filter by location if specified
        const { data: serviceLocations } = await supabase
          .from('service_locations')
          .select('service_id')
          .eq('location_id', locationId);
        
        if (serviceLocations && serviceLocations.length > 0) {
          const serviceIds = serviceLocations.map(sl => sl.service_id);
          query = query.in('id', serviceIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch packages
  const { data: packages = [], isLoading: isPackagesLoading } = useQuery({
    queryKey: ['packages', locationId],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select(`
          *,
          services:package_services(
            services(*)
          )
        `)
        .eq('is_active', true)
        .order('name');
      
      if (locationId) {
        // Filter by location if specified
        const { data: packageLocations } = await supabase
          .from('package_locations')
          .select('package_id')
          .eq('location_id', locationId);
        
        if (packageLocations && packageLocations.length > 0) {
          const packageIds = packageLocations.map(pl => pl.package_id);
          query = query.in('id', packageIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map((pkg: any) => ({
        ...pkg,
        services: pkg.services.map((s: any) => s.services)
      })) as ServicePackage[];
    },
  });

  // Fetch categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });

  // Filter services based on search query and selected category
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!selectedCategoryId || service.category_id === selectedCategoryId)
  );

  // Filter packages based on search query
  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if a service is selected
  const isServiceSelected = (serviceId: string) => {
    return selectedServices.includes(serviceId);
  };

  // Check if a package is selected
  const isPackageSelected = (packageId: string) => {
    return selectedPackages.includes(packageId);
  };

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    if (onServiceSelect) {
      onServiceSelect(serviceId);
    } else {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        addItem({
          id: service.id,
          name: service.name,
          price: service.selling_price,
          duration: service.duration,
          type: 'service',
          service: service,
          service_id: service.id
        });
      }
    }
  };

  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    if (onPackageSelect) {
      onPackageSelect(packageId);
    } else {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        addItem({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          type: 'package',
          package: pkg,
          package_id: pkg.id
        });
      }
    }
  };

  // Check if a service is in the cart
  const isServiceInCart = (serviceId: string) => {
    return cartItems.some(item => 
      item.type === 'service' && item.service_id === serviceId
    );
  };

  // Check if a package is in the cart
  const isPackageInCart = (packageId: string) => {
    return cartItems.some(item => 
      item.type === 'package' && item.package_id === packageId
    );
  };

  // Handle booking for a service
  const handleBookService = (serviceId: string) => {
    navigate(`/unified-scheduling?serviceId=${serviceId}`);
  };

  // Handle booking for a package
  const handleBookPackage = (packageId: string) => {
    navigate(`/unified-scheduling?packageId=${packageId}`);
  };

  // Handle view package details
  const handleViewPackageDetails = (packageId: string) => {
    navigate(`/packages/${packageId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services or packages..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {!isBookingFlow && (
          <Button onClick={() => navigate('/cart')} variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>View Cart ({cartItems.length})</span>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        
        <div className="mt-4 mb-6">
          {activeTab === 'services' && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategoryId === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategoryId(null)}
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <TabsContent value="services">
          {isServicesLoading ? (
            <div>Loading services...</div>
          ) : filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(service => (
                <Card key={service.id} className="overflow-hidden">
                  {service.image_urls && service.image_urls.length > 0 && (
                    <div className="aspect-[4/3] relative">
                      <img 
                        src={service.image_urls[0]} 
                        alt={service.name} 
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{service.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{service.description}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span>{service.duration} min</span>
                          <span>•</span>
                          <span className="font-semibold">₹{service.selling_price}</span>
                        </div>
                      </div>
                      <div>
                        {isBookingFlow ? (
                          <Checkbox 
                            checked={isServiceSelected(service.id)}
                            onCheckedChange={() => handleServiceSelect(service.id)}
                          />
                        ) : (
                          isServiceInCart(service.id) ? (
                            <Button size="sm" variant="secondary" disabled>
                              <Check className="h-4 w-4 mr-1" />
                              Added
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleBookService(service.id)}>
                                Book
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleServiceSelect(service.id)}>
                                Add to Cart
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No services found</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="packages">
          {isPackagesLoading ? (
            <div>Loading packages...</div>
          ) : filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPackages.map(pkg => (
                <Card key={pkg.id} className="overflow-hidden">
                  {pkg.image_urls && pkg.image_urls.length > 0 && (
                    <div className="aspect-[4/3] relative">
                      <img 
                        src={pkg.image_urls[0]} 
                        alt={pkg.name} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-semibold">
                        Save {pkg.discount_percentage}%
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium text-lg">{pkg.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{pkg.description}</p>
                        
                        <div className="mt-2">
                          <p className="text-sm font-medium">Includes:</p>
                          <ul className="text-sm text-muted-foreground mt-1">
                            {pkg.services.slice(0, 3).map((service: Service) => (
                              <li key={service.id} className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-primary" />
                                {service.name}
                              </li>
                            ))}
                            {pkg.services.length > 3 && (
                              <li className="text-xs text-muted-foreground">
                                +{pkg.services.length - 3} more services
                              </li>
                            )}
                          </ul>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-semibold">₹{pkg.price}</span>
                        </div>
                      </div>
                      <div>
                        {isBookingFlow ? (
                          <Checkbox 
                            checked={isPackageSelected(pkg.id)}
                            onCheckedChange={() => handlePackageSelect(pkg.id)}
                          />
                        ) : (
                          isPackageInCart(pkg.id) ? (
                            <Button size="sm" variant="secondary" disabled>
                              <Check className="h-4 w-4 mr-1" />
                              Added
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => handleBookPackage(pkg.id)}>
                                Book
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handlePackageSelect(pkg.id)}>
                                Add to Cart
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No packages found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServiceSelector;
