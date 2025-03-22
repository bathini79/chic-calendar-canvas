
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatPrice } from '@/lib/utils';

interface ServiceSelectorProps {
  selectedServices: string[];
  selectedPackages: string[];
  onServicesChange: (services: string[]) => void;
  onPackagesChange: (packages: string[]) => void;
  refreshCart: () => Promise<void>;
  cartItemId: string | null;
  setCartItemId: (id: string | null) => void;
  selectedPackage: any | null;
  setSelectedPackage: (pkg: any | null) => void;
  isCustomizeOpen: boolean;
  setIsCustomizeOpen: (open: boolean) => void;
}

export function ServiceSelector({
  selectedServices,
  selectedPackages,
  onServicesChange,
  onPackagesChange,
  refreshCart,
  cartItemId,
  setCartItemId,
  selectedPackage,
  setSelectedPackage,
  isCustomizeOpen,
  setIsCustomizeOpen
}: ServiceSelectorProps) {
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
    fetchPackages();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
      setServices([]);
    }
  };

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*, package_services!inner(*, service:services(*))')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
      setPackages([]);
    }
  };

  const handleServiceToggle = async (serviceId: string) => {
    const isSelected = selectedServices.includes(serviceId);
    let updatedServices;

    if (isSelected) {
      updatedServices = selectedServices.filter(id => id !== serviceId);
    } else {
      updatedServices = [...selectedServices, serviceId];
    }

    onServicesChange(updatedServices);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to continue");
      return;
    }

    const user = session.user;
    if (user) {
      try {
        if (isSelected) {
          // Remove service from cart
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('customer_id', user.id)
            .eq('service_id', serviceId);

          if (error) throw error;
          toast.success('Service removed from cart');
        } else {
          // Add service to cart
          const service = services.find(s => s.id === serviceId);
          if (!service) throw new Error('Service not found');

          const { error } = await supabase
            .from('cart_items')
            .insert({
              customer_id: user.id,
              service_id: serviceId,
              package_id: null,
              selling_price: service.selling_price,
              duration: service.duration || 0,
            });

          if (error) throw error;
          toast.success(`${service.name} added to cart`);
        }

        await refreshCart();
      } catch (error) {
        console.error('Error updating cart:', error);
        toast.error('Failed to update cart');
      }
    }
  };

  const handlePackageToggle = (packageId: string) => {
    const isSelected = selectedPackages.includes(packageId);
    let updatedPackages;

    if (isSelected) {
      updatedPackages = selectedPackages.filter(id => id !== packageId);
    } else {
      updatedPackages = [...selectedPackages, packageId];
    }

    onPackagesChange(updatedPackages);
  };

  // Fix the type issues in the existing ServiceSelector component
  const handleAddPackageToCart = async (packageItem: any) => {
    try {
      // Get the user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to continue");
        return;
      }

      const user = session.user;
      
      // Get the selected package's services
      const packageServices = packageItem.package_services.map((ps: any) => ps.service);
      
      // Create a cart item for the package
      const { data: cartItem, error } = await supabase
        .from('cart_items')
        .insert({
          customer_id: user.id,
          package_id: packageItem.id,
          service_id: null,
          selling_price: packageItem.price,
          duration: packageItem.duration || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Redirect to customization if package is customizable
      if (packageItem.is_customizable) {
        setSelectedPackage(packageItem);
        setCartItemId(cartItem.id);
        setIsCustomizeOpen(true);
      } else {
        toast.success(`${packageItem.name} added to cart`);
        await refreshCart();
      }
    } catch (error) {
      console.error('Error adding package to cart:', error);
      toast.error('Failed to add package to cart');
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search services or packages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div>
        <h2 className="text-lg font-semibold mb-2">Services</h2>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-2">
            {filteredServices.map(service => (
              <div key={service.id} className="flex items-center justify-between">
                <Label htmlFor={`service-${service.id}`} className="cursor-pointer">
                  {service.name}
                </Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{formatPrice(service.selling_price)}</Badge>
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Packages</h2>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-2">
            {filteredPackages.map(packageItem => (
              <div key={packageItem.id} className="flex items-center justify-between">
                <Label htmlFor={`package-${packageItem.id}`} className="cursor-pointer">
                  {packageItem.name}
                </Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{formatPrice(packageItem.price)}</Badge>
                  <Button size="sm" onClick={() => handleAddPackageToCart(packageItem)}>
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
