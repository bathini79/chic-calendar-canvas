
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusSectionProps {
  value: "active" | "inactive";
  onValueChange: (value: "active" | "inactive") => void;
}

export function StatusSection({ value, onValueChange }: StatusSectionProps) {
  return (
    <div>
      <label className="text-sm font-medium">Status</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
