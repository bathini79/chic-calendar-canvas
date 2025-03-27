
import React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyAppointmentsProps {
  type: "upcoming" | "past";
}

export const EmptyAppointments: React.FC<EmptyAppointmentsProps> = ({ type }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-16 h-16 bg-gradient-to-b from-purple-400 to-purple-100 rounded-full flex items-center justify-center mb-4">
        <CalendarIcon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {type === "upcoming" ? "No upcoming appointments" : "No past appointments"}
      </h3>
      <p className="text-muted-foreground mb-6">
        {type === "upcoming"
          ? "Your upcoming appointments will appear here when you book"
          : "Your past appointment history will appear here"}
      </p>
      {type === "upcoming" && (
        <Button onClick={() => window.location.href = "/services"}>
          Book an appointment
        </Button>
      )}
    </div>
  );
};
