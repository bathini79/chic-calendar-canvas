
import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CheckboxGroupProps {
  children: ReactNode;
  className?: string;
}

export function CheckboxGroup({ children, className }: CheckboxGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}
