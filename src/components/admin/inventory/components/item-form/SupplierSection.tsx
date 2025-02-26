
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupplierSectionProps {
  value: string;
  onValueChange: (value: string) => void;
  suppliers: Array<{ id: string; name: string }>;
}

export function SupplierSection({ value, onValueChange, suppliers }: SupplierSectionProps) {
  return (
    <div>
      <label className="text-sm font-medium">Supplier</label>
      <Select value={value || "none"} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a supplier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Supplier</SelectItem>
          {suppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id}>
              {supplier.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
