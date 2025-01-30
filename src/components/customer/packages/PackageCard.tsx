import { Package, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PackageService {
  service: {
    id: string;
    name: string;
  };
}

interface PackageCardProps {
  pkg: {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
    is_customizable: boolean;
    image_urls?: string[];
    package_services: PackageService[];
  };
  onCustomize: (pkg: any) => void;
}

export function PackageCard({ pkg, onCustomize }: PackageCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full flex flex-col">
      {pkg.image_urls && pkg.image_urls[0] ? (
        <div className="relative aspect-video">
          <img
            src={pkg.image_urls[0]}
            alt={pkg.name}
            className="w-full h-full object-cover rounded-t-lg"
          />
        </div>
      ) : (
        <div className="bg-muted aspect-video rounded-t-lg flex items-center justify-center">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {pkg.description && (
          <p className="text-sm text-muted-foreground">{pkg.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {pkg.package_services.map(({ service }) => (
            <Badge key={service.id} variant="secondary">
              {service.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{pkg.duration} min</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>₹{pkg.price}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {pkg.is_customizable ? (
          <div className="flex w-full gap-2">
            <Button 
              className="flex-[7]"
              onClick={() => navigate(`/book/package/${pkg.id}`)}
            >
              Book Now
            </Button>
            <Button 
              variant="outline" 
              className="flex-[3]"
              onClick={() => onCustomize(pkg)}
            >
              Customize
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full"
            onClick={() => navigate(`/book/package/${pkg.id}`)}
          >
            Book Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}