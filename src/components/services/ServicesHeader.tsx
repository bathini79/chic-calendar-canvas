import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ServicesHeaderProps {
  onCreateClick: () => void;
}

export function ServicesHeader({ onCreateClick }: ServicesHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Services</h1>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add Service
      </Button>
    </div>
  );
}