
import React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EmptyAppointmentsProps {
  type: "upcoming" | "past";
}

export const EmptyAppointments: React.FC<EmptyAppointmentsProps> = ({ type }) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg p-4">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
        <CalendarIcon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">
        {type === "upcoming" ? "No upcoming appointments" : "No past appointments"}
      </h3>
      <p className="text-muted-foreground mb-4 text-sm">
        {type === "upcoming"
          ? "Book your next appointment to see it here"
          : "Your past appointment history will appear here"}
      </p>
      {type === "upcoming" && (
        <Button onClick={() => navigate("/services")}>
          Book an appointment
        </Button>
      )}
    </div>
  );
};
