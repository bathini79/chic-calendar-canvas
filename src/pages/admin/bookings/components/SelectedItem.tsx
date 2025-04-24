import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Clock, User, IndianRupee } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PackageServiceItem } from './PackageServiceItem';

interface SelectedItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    adjustedPrice: number;
    duration: number;
    type: "service" | "package";
    stylistName?: string | null;
    time?: string;
    formattedDuration: string;
    services?: Array<{
      id: string;
      name: string;
      price: number;
      adjustedPrice: number;
      duration: number;
      stylistName?: string | null;
      isCustomized: boolean;
    }>;
  };
  onRemove: () => void;
}

export const SelectedItem: React.FC<SelectedItemProps> = ({ item, onRemove }) => {
  return (
    <div className="flex flex-col py-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">{item.name}</p>
          <div className="flex flex-wrap text-sm text-muted-foreground gap-2">
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {item.time && <span>{item.time} • {item.formattedDuration}</span>}
              {!item.time && <span>{item.formattedDuration}</span>}
            </div>
            {item.stylistName && (
              <div className="flex items-center">
                <User className="mr-1 h-4 w-4" />
                {item.stylistName}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {item.type === "package" && (
            <div className="flex justify-end">
              {item.price !== item.adjustedPrice && (
                <p className="font-medium text-lg line-through text-muted-foreground mr-2">
                  <IndianRupee className="inline h-4 w-4" />
                  {item.price.toFixed(2)}
                </p>
              )}
              <p
                className={`font-semibold text-lg ${
                  item.price !== item.adjustedPrice ? "text-green-600" : ""
                }`}
              >
                <IndianRupee className="inline h-4 w-4" />
                {item.adjustedPrice.toFixed(2)}
              </p>
            </div>
          )}
          {item.type === "service" && (
            <div className="flex justify-end">
              {item.price !== item.adjustedPrice && (
                <p className="font-medium text-lg line-through text-muted-foreground mr-2">
                  <IndianRupee className="inline h-4 w-4" />
                  {item.price.toFixed(2)}
                </p>
              )}
              <p
                className={`font-semibold text-lg ${
                  item.price !== item.adjustedPrice ? "text-green-600" : ""
                }`}
              >
                <IndianRupee className="inline h-4 w-4" />
                {item.adjustedPrice.toFixed(2)}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {item.type === "package" && item.services && item.services.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="package-details">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-primary border-t border-gray-200 pt-2">
              View Package Details
            </AccordionTrigger>
            <AccordionContent className="mt-2 space-y-4 bg-gray-50 rounded-md p-4 border border-gray-200">
              {item.services.map((service) => (
                <PackageServiceItem key={service.id} service={service} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};