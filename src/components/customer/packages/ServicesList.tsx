import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface ServicesListProps {
  selectedPackage: any;
  selectedServices: string[];
  allServices: any[];
  onServiceToggle: (serviceId: string, checked: boolean) => void;
}

export function ServicesList({
  selectedPackage,
  selectedServices,
  allServices,
  onServiceToggle,
}: ServicesListProps) {
  const isServiceIncluded = (serviceId: string) => {
    return selectedPackage?.package_services.some((ps: any) => ps.service.id === serviceId);
  };

  return (
    <div className="space-y-6 p-1">
      <div className="space-y-4">
        <h3 className="font-semibold">Included Services</h3>
        {selectedPackage?.package_services.map(({ service }: any) => (
          <div
            key={service.id}
            className="flex items-center space-x-2 p-2 rounded-lg bg-muted"
          >
            <Checkbox
              checked={true}
              disabled
            />
            <div className="flex-1">
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">
                {service.duration} min • ₹{service.selling_price}
              </p>
            </div>
            <Badge>Included</Badge>
          </div>
        ))}
      </div>

      {selectedPackage?.is_customizable && (
        <div className="space-y-4">
          <Separator />
          <h3 className="font-semibold">Optional Services</h3>
          {allServices
            ?.filter(service => 
              !isServiceIncluded(service.id) &&
              selectedPackage.customizable_services?.includes(service.id)
            )
            .map((service) => (
              <div
                key={service.id}
                className="flex items-center space-x-2 p-2 rounded-lg bg-muted"
              >
                <Checkbox
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={(checked) => 
                    onServiceToggle(service.id, checked as boolean)
                  }
                />
                <div className="flex-1">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {service.duration} min • ₹{service.selling_price}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}