import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";

export interface PhoneInputProps extends Omit<InputProps, "type" | "onChange"> {
  onChange?: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "");
      const formattedValue = formatPhoneNumber(value);
      e.target.value = formattedValue;
      onChange?.(formattedValue);
    };

    return (
      <div className="flex">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "flex gap-1 rounded-r-none border-r-0 pr-1 pl-3 text-sm",
            "select-none"
          )}
          onClick={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          <span>+91</span>
        </Button>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          onChange={handleChange}
          className={cn("rounded-l-none", className)}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

// Helper to format phone numbers as they are typed
function formatPhoneNumber(value: string): string {
  // For India: +91 XXXXX XXXXX
  if (!value) return "";
  
  // Keep only first 10 digits
  value = value.slice(0, 10);
  
  // Format as XXXXX XXXXX for readability
  if (value.length > 5) {
    return `${value.slice(0, 5)} ${value.slice(5)}`;
  }
  
  return value;
}

export { PhoneInput };
