import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Globe } from "lucide-react";
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

// Country codes data
const countryCodes = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Afghanistan", code: "+93", flag: "🇦🇫" },
  { name: "Albania", code: "+355", flag: "🇦🇱" },
  { name: "Algeria", code: "+213", flag: "🇩🇿" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Austria", code: "+43", flag: "🇦🇹" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "+964", flag: "🇮🇶" },
  { name: "Ireland", code: "+353", flag: "🇮🇪" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { name: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Syria", code: "+963", flag: "🇸🇾" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
];

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
  onCountryChange?: (country: {name: string, code: string, flag: string}) => void;
  selectedCountry?: {name: string, code: string, flag: string};
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, onCountryChange, selectedCountry, ...props }, ref) => {
    const [country, setCountry] = React.useState(selectedCountry || countryCodes[0]);
    const [open, setOpen] = React.useState(false);

    const handleCountrySelect = (selectedCountry: typeof country) => {
      setCountry(selectedCountry);
      setOpen(false);
      if (onCountryChange) {
        onCountryChange(selectedCountry);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      
      // Restrict to 10 digits
      if (value.length > 10) {
        value = value.slice(0, 10);
      }
      
      const formattedValue = formatPhoneNumber(value);
      e.target.value = formattedValue;
      
      if (onChange) {
        onChange(formattedValue);
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

// Helper to format phone numbers as they are typed
function formatPhoneNumber(value: string): string {
  // Keep only first 10 digits
  value = value.slice(0, 10);
  
  // Format as XXXXX XXXXX for readability
  if (value.length > 5) {
    return `${value.slice(0, 5)} ${value.slice(5)}`;
  }
  
  return value;
}

export { PhoneInput };
