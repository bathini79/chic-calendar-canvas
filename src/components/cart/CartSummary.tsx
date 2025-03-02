
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
    // Handle items with package_id (usually from appointment dialog)
    if (item.package_id) {
      const packageId = item.package_id;
      
      // Initialize package if it doesn't exist in accumulator
      if (!acc.packages[packageId]) {
        // Find the package item in the cart items array
        const packageItem = items.find(p => 
          (p.id === packageId) || (p.package?.id === packageId)
        );
        
        acc.packages[packageId] = {
          package: packageItem?.package || { 
            id: packageId,
            name: item.package?.name || 'Package',
            duration: item.package?.duration || 0,
            selling_price: item.package?.price || item.price_paid || 0,
          },
          services: [],
          timeSlot: selectedTimeSlots[packageId] || selectedTimeSlots[item.id] || ''
        };
      }
      
      // Add service to package's services array if it has service_id
      if (item.service_id && item.service) {
        if (!acc.packages[packageId].services.some(s => s.id === item.service_id)) {
          acc.packages[packageId].services.push(item.service);
        }
      }
    }
    // Handle regular package items (From CartContext)
    else if (item.package_id || item.package) {
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
        items.forEach(cartItem => {
          if (cartItem.service && 
              item.customized_services?.includes(cartItem.service.id) && 
              !acc.packages[packageId].services.some(s => s.id === cartItem.service.id)) {
            acc.packages[packageId].services.push(cartItem.service);
          }
        });
      }
    } 
    // Handle standalone service items
    else if (item.service_id || item.service) {
      const serviceId = item.service_id || item.service?.id;
      // Check if this service is part of a package (in booking data)
      const isPartOfPackage = items.some(packageItem => 
        packageItem.package_id && packageItem.service_id === serviceId
      );
      
      // Also check in customized services
      const isPartOfCustomPackage = items.some(packageItem => 
        packageItem.customized_services?.includes(serviceId)
      );
      
      // Only add to standalone services if not part of a package
      if (!isPartOfPackage && !isPartOfCustomPackage) {
        acc.services.push({
          ...item,
          timeSlot: selectedTimeSlots[item.id] || ''
        });
      }
    }
    
    return acc;
  }, { packages: {} as Record<string, any>, services: [] as any[] });
  
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
                          ₹{pkg.selling_price || pkg.price || pkg.price_paid}
                        </p>
                        {isSchedulingPage && packageItem.timeSlot && selectedDate && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {format(selectedDate, "MMM d")} at {packageItem.timeSlot} - 
                            {format(
                              addMinutes(
                                new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${packageItem.timeSlot}`),
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
                const price = item.selling_price || service.selling_price || item.price_paid || 0;
                
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
                          ₹{price}
                        </p>
                        {isSchedulingPage && item.timeSlot && selectedDate && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {format(selectedDate, "MMM d")} at {item.timeSlot} - 
                            {format(
                              addMinutes(
                                new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${item.timeSlot}`),
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
