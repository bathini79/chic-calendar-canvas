
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { format, addMinutes } from "date-fns";

export function CartSummary() {
  const { 
    items, 
    removeFromCart, 
    selectedDate, 
    selectedTimeSlots,
    getTotalPrice
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';

  const totalPrice = getTotalPrice();
  const isTimeSelected = Object.keys(selectedTimeSlots).length > 0;
  
  // Group items by packages and standalone services
  const groupedItems = items.reduce((acc, item) => {
    // If it's a package
    if (item.package_id || item.package) {
      const packageId = item.package_id || item.package?.id || item.id;
      
      if (!acc.packages[packageId]) {
        acc.packages[packageId] = {
          package: item.package || item,
          services: [],
          timeSlot: selectedTimeSlots[item.id] || ''
        };
      }
      
      // If the package has services from package_services, add them
      if (item.package?.package_services) {
        item.package.package_services.forEach(ps => {
          if (ps.service && !acc.packages[packageId].services.some(s => s.id === ps.service.id)) {
            acc.packages[packageId].services.push(ps.service);
          }
        });
      }
      
      // Add customized services if available
      if (item.customized_services && item.customized_services.length > 0) {
        // Find the services that match the customized_services ids
        const customServices = items.filter(cartItem => 
          cartItem.service && 
          item.customized_services?.includes(cartItem.service.id)
        ).map(cartItem => cartItem.service);
        
        // Add them to the package services if not already there
        customServices.forEach(service => {
          if (service && !acc.packages[packageId].services.some(s => s.id === service.id)) {
            acc.packages[packageId].services.push(service);
          }
        });
      }
    } 
    // It's a standalone service (only if not part of a package)
    else if (item.service_id || item.service) {
      const serviceId = item.service_id || item.service?.id;
      // Check if this service is part of a customized package
      const isPartOfPackage = Object.values(items).some(
        packageItem => packageItem.customized_services?.includes(serviceId)
      );
      
      // Only add to standalone services if not part of a package
      if (!isPartOfPackage) {
        acc.services.push({
          ...item,
          timeSlot: selectedTimeSlots[item.id] || ''
        });
      }
    }
    
    return acc;
  }, { packages: {}, services: [] });
  
  // Sort items by their scheduled start time
  const sortedServices = [...groupedItems.services].sort((a, b) => {
    const aTime = a.timeSlot || "00:00";
    const bTime = b.timeSlot || "00:00";
    return aTime.localeCompare(bTime);
  });
  
  const sortedPackages = Object.values(groupedItems.packages).sort((a, b) => {
    const aTime = a.timeSlot || "00:00";
    const bTime = b.timeSlot || "00:00";
    return aTime.localeCompare(bTime);
  });

  const handleContinue = () => {
    if (isSchedulingPage) {
      if (selectedDate && isTimeSelected) {
        navigate('/booking-confirmation');
      }
    } else {
      navigate('/schedule');
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Your Cart ({items.length} items)</h2>
        <p className="text-2xl font-bold mt-2">₹{totalPrice}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            <>
              {/* Display packages first */}
              {sortedPackages.map((packageItem) => {
                const pkg = packageItem.package;
                const itemDuration = pkg.duration || 0;
                
                return (
                  <div
                    key={pkg.id}
                    className="flex flex-col space-y-2 p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-blue-600">
                          {pkg.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Duration: {itemDuration} min
                        </p>
                        <p className="text-sm font-medium">
                          ₹{pkg.selling_price || pkg.price}
                        </p>
                        {isSchedulingPage && selectedTimeSlots[pkg.id] && selectedDate && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {format(selectedDate, "MMM d")} at {selectedTimeSlots[pkg.id]} - 
                            {format(
                              addMinutes(
                                new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlots[pkg.id]}`),
                                itemDuration
                              ),
                              "HH:mm"
                            )}
                          </p>
                        )}
                      </div>
                      {!isSchedulingPage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFromCart(pkg.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    {/* Display services in this package */}
                    {packageItem.services && packageItem.services.length > 0 && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-blue-200">
                        {packageItem.services.map((service) => (
                          <div key={`pkg-${pkg.id}-service-${service.id}`} className="text-sm">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Duration: {service.duration} min
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Display standalone services */}
              {sortedServices.map((item) => {
                const service = item.service || {};
                const itemDuration = service.duration || item.duration || 0;
                
                return (
                  <div
                    key={item.id}
                    className="flex flex-col space-y-2 p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">
                          {service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Duration: {itemDuration} min
                        </p>
                        <p className="text-sm font-medium">
                          ₹{item.selling_price || service.selling_price}
                        </p>
                        {isSchedulingPage && selectedTimeSlots[item.id] && selectedDate && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {format(selectedDate, "MMM d")} at {selectedTimeSlots[item.id]} - 
                            {format(
                              addMinutes(
                                new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlots[item.id]}`),
                                itemDuration
                              ),
                              "HH:mm"
                            )}
                          </p>
                        )}
                      </div>
                      {!isSchedulingPage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button 
          className="w-full" 
          onClick={handleContinue}
          disabled={items.length === 0 || (isSchedulingPage && 
            (!selectedDate || !isTimeSelected))}
        >
          {isSchedulingPage ? 'Continue to Booking' : 'Continue to Schedule'}
        </Button>
      </div>
    </Card>
  );
}
