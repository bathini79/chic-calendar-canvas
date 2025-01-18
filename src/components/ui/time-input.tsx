import { Input } from "./input";
import { forwardRef } from "react";

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: (value: string) => void;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange, ...props }, ref) => {
    return (
      <Input
        type="time"
        ref={ref}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-32"
        {...props}
      />
    );
  }
);

TimeInput.displayName = "TimeInput";