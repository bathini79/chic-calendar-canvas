
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LocationSectionProps {
  value: string;
  onValueChange: (value: string) => void;
  locations: Array<{ id: string; name: string }>;
}

export function LocationSection({ value, onValueChange, locations }: LocationSectionProps) {
  return (
    <div>
      <label className="text-sm font-medium">Location</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a location" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
