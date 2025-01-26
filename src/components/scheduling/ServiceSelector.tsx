import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign } from "lucide-react";

interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
  services_categories: any[];
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

interface ServiceSelectorProps {
  services: Service[];
  employees: Employee[];
  selectedServices: SelectedService[];
  onServiceSelect: (serviceId: string, employeeId: string) => void;
}

export function ServiceSelector({
  services,
  employees,
  selectedServices,
  onServiceSelect,
}: ServiceSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Select Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const selectedService = selectedServices.find(s => s.serviceId === service.id);
          const isSelected = !!selectedService;

          return (
            <Card key={service.id} className={`transition-colors ${isSelected ? 'border-primary' : ''}`}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onServiceSelect(service.id, 'any');
                        } else {
                          onServiceSelect(service.id, '');
                        }
                      }}
                    />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex gap-2">
                    {service.services_categories?.map((sc: any) => (
                      <Badge key={sc.categories.id} variant="secondary">
                        {sc.categories.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>₹{service.selling_price}</span>
                  </div>
                </div>

                {isSelected && (
                  <Select
                    value={selectedService.employeeId}
                    onValueChange={(value) => onServiceSelect(service.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose stylist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Available Stylist</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}