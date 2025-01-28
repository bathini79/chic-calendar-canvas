import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void;
}

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, onChange, ...props }, ref) => {
    return (
      <input
        type="time"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={(e) => onChange(e.target.value)}
        ref={ref}
        {...props}
      />
    );
  }
);

TimeInput.displayName = "TimeInput";

export { TimeInput };