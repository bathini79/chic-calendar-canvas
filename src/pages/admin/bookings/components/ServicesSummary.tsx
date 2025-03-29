
import React from "react";
import { formatPrice } from "@/lib/utils";
import { Service, Package } from "../types";
import { X } from "lucide-react";

interface ServicesSummaryProps {
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  selectedStylists: Record<string, string>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  customizedServices: Record<string, string[]>;
}

export const ServicesSummary: React.FC<ServicesSummaryProps> = ({
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedStylists,
  onRemoveService,
  onRemovePackage,
  customizedServices,
}) => {
  // Find stylist name from ID
  const getStylistName = (stylistId: string) => {
    // This would be replaced with an actual lookup in a real implementation
    return stylistId || "Unassigned";
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Selected Services</h3>
      
      {/* Individual Services */}
      {selectedServices.length > 0 && (
        <div className="space-y-2">
          {selectedServices.map((serviceId) => {
            const service = services.find((s) => s.id === serviceId);
            if (!service) return null;
            
            return (
              <div key={service.id} className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getStylistName(selectedStylists[serviceId])}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-right">{formatPrice(service.selling_price || 0)}</p>
                  <button 
                    onClick={() => onRemoveService(service.id)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Packages */}
      {selectedPackages.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold mt-4">Selected Packages</h3>
          
          {selectedPackages.map((packageId) => {
            const pkg = packages.find((p) => p.id === packageId);
            if (!pkg) return null;
            
            // Get package services
            const packageServices = pkg.package_services || [];
            
            // Get customized services for this package
            const customServices = (customizedServices[packageId] || [])
              .map(serviceId => services.find(s => s.id === serviceId))
              .filter(Boolean) as Service[];
            
            return (
              <div key={pkg.id} className="border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{pkg.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStylistName(selectedStylists[packageId])}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p>{formatPrice(pkg.price || 0)}</p>
                    <button 
                      onClick={() => onRemovePackage(pkg.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Show included services */}
                <div className="mt-2 border-t pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Included services:</p>
                  {packageServices.map((ps) => {
                    const service = ps.service;
                    return (
                      <div key={`${pkg.id}-${service.id}`} className="text-sm pl-3 py-1 flex justify-between">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground">
                          {getStylistName(selectedStylists[service.id] || selectedStylists[packageId])}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Show customized services */}
                {customServices.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Additional services:</p>
                    {customServices.map((service) => (
                      <div key={`custom-${pkg.id}-${service.id}`} className="text-sm pl-3 py-1 flex justify-between">
                        <span>{service.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatPrice(service.selling_price || 0)}</span>
                          <span className="text-muted-foreground">
                            {getStylistName(selectedStylists[service.id] || selectedStylists[packageId])}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {selectedServices.length === 0 && selectedPackages.length === 0 && (
        <p className="text-muted-foreground">No services or packages selected.</p>
      )}
    </div>
  );
};
