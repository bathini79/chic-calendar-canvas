import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import "./calendar-global-fix.css"; // Use the consolidated CSS file
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-[#f8f8fb]", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-2",
        caption: "flex justify-center pt-2 pb-3 relative items-center px-6",
        caption_label: "text-sm font-medium flex-grow text-center text-black",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-muted/30 border-0 rounded-full"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse border-spacing-0",
        head_row: "grid grid-cols-7 mb-2",        head_cell:
          "text-muted-foreground w-9 h-8 font-normal text-[0.8rem] flex items-center justify-center",row: "grid grid-cols-7 w-full mt-0 gap-0",        cell: "h-9 w-9 text-center p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center text-black border-0 m-0",        day: cn(
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors !text-black [&.day_selected]:!text-white [&.day_range_end]:!text-white [&.day_range_start]:!text-white text-sm"
        ),
        day_range_end: "day-range-end bg-black text-white rounded-full",
        day_selected:
          "bg-black text-white hover:bg-black/90 hover:text-white focus:bg-black focus:text-white !text-white",
        day_today: "border border-gray-300 text-black font-medium",
        day_outside:
          "day-outside text-muted-foreground opacity-30",
        day_disabled: "text-muted-foreground opacity-30",        day_range_middle:
          "aria-selected:!text-black !rounded-none !text-black mx-0 w-full h-full hover:bg-gray-100 text-sm border-0 bg-transparent",
        day_range_start: "day-range-start bg-black text-white rounded-full",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
