
import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const PhoneInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        type="tel"
        autoComplete="tel"
        className={cn("", className)}
        ref={ref}
        {...props}
      />
    )
  }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
