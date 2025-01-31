import { Clock, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PackageCardProps {
  pkg: any;
  isInCart: boolean;
  onBookNow: (packageId: string) => void;
  onRemove: (packageId: string) => void;
  onCustomize: (pkg: any) => void;
}

export function PackageCard({
  pkg,
  isInCart,
  onBookNow,
  onRemove,
  onCustomize,
}: PackageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
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
          <div className="flex gap-2"> 
            <Package className="h-5 w-5 text-primary" /> 
            <Badge variant="outline" className="text-xs">Package</Badge>
          </div>
          <CardTitle>{pkg.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-muted-foreground line-clamp-2">
            {pkg.description || "No description available"}
          </p>
          <div className="flex items-center gap-4 mt-4">
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
              {isInCart ? (
                <Button 
                  className="flex-[7] bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
                  onClick={() => onRemove(pkg.id)}
                  variant="destructive"
                >
                  Remove
                </Button>
              ) : (
                <Button 
                  className="flex-[7]"
                  onClick={() => onBookNow(pkg.id)}
                >
                  Book Now
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-[3]"
                onClick={() => onCustomize(pkg)}
              >
                Customize
              </Button>
            </div>
          ) : (
            isInCart ? (
              <Button 
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
                onClick={() => onRemove(pkg.id)}
                variant="destructive"
              >
                Remove
              </Button>
            ) : (
              <Button 
                className="w-full"
                onClick={() => onBookNow(pkg.id)}
              >
                Book Now
              </Button>
            )
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}