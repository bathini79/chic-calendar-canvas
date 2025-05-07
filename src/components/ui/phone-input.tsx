import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countryCodes, CountryCode } from "@/lib/country-codes";

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
  onCountryChange?: (country: CountryCode) => void;
  selectedCountry?: CountryCode;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, onCountryChange, selectedCountry, ...props }, ref) => {
    const [country, setCountry] = React.useState(selectedCountry || countryCodes.find(c => c.name === "India") || countryCodes[0]);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      if (selectedCountry) {
        setCountry(selectedCountry);
      }
    }, [selectedCountry]);

    const handleCountrySelect = (selectedCountry: CountryCode) => {
      setCountry(selectedCountry);
      setOpen(false);
      if (onCountryChange) {
        onCountryChange(selectedCountry);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      
      if (value.length > 10) {
        value = value.slice(0, 10);
      }
      
      // Display formatted (with spaces) but pass only digits to onChange
      const formattedValue = formatPhoneNumber(value);
      e.target.value = formattedValue;
      
      if (onChange) {
        // Pass only digits to onChange handler
        onChange(value);
      }
    };

    return (
      <div className="flex">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex gap-1 rounded-r-none border-r-0 px-3 text-sm",
                "select-none min-w-[90px] justify-between"
              )}
            >
              <span>{country.flag}</span>
              <span>{country.code}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[220px]" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countryCodes.map((item) => (
                    <CommandItem
                      key={`${item.name}-${item.code}`}
                      onSelect={() => handleCountrySelect(item)}
                      className="flex items-center gap-2"
                    >
                      <span className="mr-1">{item.flag}</span>
                      <span>{item.name}</span>
                      <span className="ml-auto text-muted-foreground">{item.code}</span>
                      {country.name === item.name && country.code === item.code && (
                        <Check className="h-4 w-4 ml-1" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          onChange={handleChange}
          className={cn("rounded-l-none", className)}
          placeholder="9876543210..."
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

function formatPhoneNumber(value: string): string {
  value = value.slice(0, 10);
  
  if (value.length > 5) {
    return `${value.slice(0, 5)} ${value.slice(5)}`;
  }
  
  return value;
}

export { PhoneInput };
