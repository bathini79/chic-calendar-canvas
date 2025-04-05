
import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { countryCodes, CountryCode } from "@/lib/country-codes";

export interface CountryCodeDropdownProps {
  value: CountryCode;
  onChange: (value: CountryCode) => void;
  className?: string;
}

export function CountryCodeDropdown({
  value,
  onChange,
  className,
}: CountryCodeDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <span>{value.flag}</span>
          <span>{value.code}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countryCodes.map((country) => (
                <CommandItem
                  key={`${country.name}-${country.code}`}
                  onSelect={() => {
                    onChange(country);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="mr-1">{country.flag}</span>
                  <span>{country.name}</span>
                  <span className="ml-auto text-muted-foreground">
                    {country.code}
                  </span>
                  {value.name === country.name && value.code === country.code && (
                    <Check className="h-4 w-4 ml-1" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default CountryCodeDropdown;
