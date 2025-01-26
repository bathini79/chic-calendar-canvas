import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, DollarSign } from "lucide-react";

interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
}

interface Employee {
  id: string;
  name: string;
}

interface SelectedService {
  serviceId: string;
  employeeId: string | 'any';
  startTime?: Date;
}

interface BookingSummaryProps {
  selectedServices: SelectedService[];
  services: Service[];
  employees: Employee[];
  onConfirm: () => void;
}

export function BookingSummary({
  selectedServices,
  services,
  employees,
  onConfirm
}: BookingSummaryProps) {
  const getServiceDetails = (serviceId: string) => 
    services.find(s => s.id === serviceId);

  const getEmployeeName = (employeeId: string) => {
    if (employeeId === 'any') return 'Any Available Stylist';
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : 'Unknown Stylist';
  };

  const totalPrice = selectedServices.reduce((total, selected) => {
    const service = getServiceDetails(selected.serviceId);
    return total + (service?.selling_price || 0);
  }, 0);

  const allTimesSelected = selectedServices.every(s => s.startTime);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedServices.map((selected) => {
          const service = getServiceDetails(selected.serviceId);
          if (!service) return null;

          return (
            <div key={selected.serviceId} className="space-y-2 pb-4 border-b">
              <h3 className="font-medium">{service.name}</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Stylist: {getEmployeeName(selected.employeeId)}</p>
                {selected.startTime && (
                  <p>Time: {format(selected.startTime, 'h:mm a')}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>₹{service.selling_price}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Price:</span>
            <span className="text-lg font-bold">₹{totalPrice}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={onConfirm}
          disabled={!allTimesSelected || selectedServices.length === 0}
        >
          Confirm Booking
        </Button>
      </CardFooter>
    </Card>
  );
}