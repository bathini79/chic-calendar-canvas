
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Service, Package } from '@/pages/admin/bookings/types';
import { useActiveServices } from '@/pages/admin/bookings/hooks/useActiveServices';
import { useActivePackages } from '@/pages/admin/bookings/hooks/useActivePackages';
import { Search, Clock, Plus, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/components/cart/CartContext';

interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string) => void;
  onStylistSelect?: (itemId: string, stylistId: string) => void;
  selectedServices?: string[];
  selectedPackages?: string[];
  stylists?: any[];
  selectedStylists?: Record<string, string>;
  locationId?: string;
  onCustomPackage?: (packageId: string, serviceId: string) => void;
  customizedServices?: Record<string, string[]>;
  items?: any[]; // For customer-facing cart components
}

export function ServiceSelector({
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  selectedServices = [],
  selectedPackages = [],
  stylists = [],
  selectedStylists = {},
  locationId,
  onCustomPackage = () => {},
  customizedServices = {},
  items = []
}: ServiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('services');
  const { data: servicesData = [], isLoading: isLoadingServices } = useActiveServices(locationId);
  const { data: packagesData = [], isLoading: isLoadingPackages } = useActivePackages(locationId);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const cart = useCart();
  const cartItems = cart?.cartItems || [];
  
  // Filter services and packages based on search query
  useEffect(() => {
    if (servicesData) {
      const filtered = servicesData.filter((service: any) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredServices(filtered as Service[]);
    }
    
    if (packagesData) {
      const filtered = packagesData.filter((pkg: any) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPackages(filtered as Package[]);
    }
  }, [searchQuery, servicesData, packagesData]);

  const handleServiceSelect = (serviceId: string) => {
    if (onServiceSelect) {
      onServiceSelect(serviceId);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    if (onPackageSelect) {
      onPackageSelect(packageId);
    }
  };

  const handleStylistChange = (itemId: string, stylistId: string) => {
    if (onStylistSelect) {
      onStylistSelect(itemId, stylistId);
    }
  };

  const handleCustomizableServiceToggle = (packageId: string, serviceId: string) => {
    if (onCustomPackage) {
      onCustomPackage(packageId, serviceId);
    }
  };

  // Helper function to check if an item is in cart
  const isItemInCart = (id: string, itemType: 'package' | 'service') => {
    if (!cartItems || !cartItems.length) return false;
    
    return cartItems.some((item: any) => {
      if (itemType === 'package') {
        return item.package?.id === id;
      } else {
        return item.service?.id === id;
      }
    });
  };
  
  // Function to get cart item ID for an item
  const getCartItemId = (id: string, itemType: 'package' | 'service') => {
    if (!cartItems || !cartItems.length) return null;
    
    const cartItem = cartItems.find((item: any) => {
      if (itemType === 'package') {
        return item.package?.id === id;
      } else {
        return item.service?.id === id;
      }
    });
    
    return cartItem ? cartItem.id : null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 relative">
        <Input
          placeholder="Search services or packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="services" className="flex-1 overflow-auto">
          {isLoadingServices ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No services found. Try adjusting your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                    selectedServices.includes(service.id) ? 'bg-primary/10 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {service.description || 'No description available'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className="font-medium">₹{service.selling_price}</span>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{service.duration} min</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    {stylists && stylists.length > 0 && (
                      <Select
                        value={selectedStylists[service.id] || ''}
                        onValueChange={(value) => handleStylistChange(service.id, value)}
                        disabled={!selectedServices.includes(service.id)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Select stylist" />
                        </SelectTrigger>
                        <SelectContent>
                          {stylists.map((stylist) => (
                            <SelectItem key={stylist.id} value={stylist.id}>
                              {stylist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      variant={selectedServices.includes(service.id) ? "default" : "outline"}
                      size="sm"
                      className="ml-auto"
                      onClick={() => handleServiceSelect(service.id)}
                    >
                      {selectedServices.includes(service.id) ? (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Selected
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" /> Select
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="packages" className="flex-1 overflow-auto">
          {isLoadingPackages ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No packages found. Try adjusting your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                    selectedPackages.includes(pkg.id) ? 'bg-primary/10 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{pkg.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {pkg.description || 'No description available'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className="font-medium">₹{pkg.price}</span>
                      {pkg.duration && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{pkg.duration} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    {stylists && stylists.length > 0 && (
                      <Select
                        value={selectedStylists[pkg.id] || ''}
                        onValueChange={(value) => handleStylistChange(pkg.id, value)}
                        disabled={!selectedPackages.includes(pkg.id)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Select stylist" />
                        </SelectTrigger>
                        <SelectContent>
                          {stylists.map((stylist) => (
                            <SelectItem key={stylist.id} value={stylist.id}>
                              {stylist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      variant={selectedPackages.includes(pkg.id) ? "default" : "outline"}
                      size="sm"
                      className="ml-auto"
                      onClick={() => handlePackageSelect(pkg.id)}
                    >
                      {selectedPackages.includes(pkg.id) ? (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Selected
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" /> Select
                        </>
                      )}
                    </Button>
                  </div>

                  {pkg.is_customizable && selectedPackages.includes(pkg.id) && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-sm font-medium mb-2">Customize package:</h4>
                      <div className="space-y-2">
                        {pkg.customizable_services?.map(serviceId => {
                          const service = servicesData.find(s => s.id === serviceId);
                          if (!service) return null;
                          
                          const isSelected = customizedServices[pkg.id]?.includes(serviceId);
                          
                          return (
                            <div key={serviceId} className="flex items-center justify-between">
                              <span className="text-sm">{service.name} (+₹{service.selling_price})</span>
                              <Button 
                                size="sm" 
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => handleCustomizableServiceToggle(pkg.id, serviceId)}
                              >
                                {isSelected ? "Added" : "Add"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
