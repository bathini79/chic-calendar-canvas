import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceCardProps {
  service: any;
  isInCart: boolean;
  onBookNow: (serviceId: string) => void;
  onRemove: (serviceId: string) => void;
}

export function ServiceCard({
  service,
  isInCart,
  onBookNow,
  onRemove,
}: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
        {service.image_urls && service.image_urls[0] ? (
          <div className="relative aspect-video">
            <img
              src={service.image_urls[0]}
              alt={service.name}
              className="w-full h-full object-cover rounded-t-lg"
            />
          </div>
        ) : (
          <div className="bg-muted aspect-video rounded-t-lg" />
        )}
        <CardHeader>
          <CardTitle className="flex justify-between items-start">
            <span>{service.name}</span>
            <div className="flex gap-2">
              {service.services_categories.map((sc: any) => (
                <Badge key={sc.categories.id} variant="secondary">
                  {sc.categories.name}
                </Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-muted-foreground line-clamp-2">
            {service.description || "No description available"}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{service.duration} min</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>₹{service.selling_price}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {isInCart ? (
            <Button 
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
              onClick={() => onRemove(service.id)}
              variant="destructive"
            >
              Remove
            </Button>
          ) : (
            <Button 
              className="w-full"
              onClick={() => onBookNow(service.id)}
            >
              Book Now
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}