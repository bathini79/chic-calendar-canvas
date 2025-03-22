
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MembershipSale } from "@/components/admin/sales/MembershipSale";
import { Plus, Calendar, ShoppingCart, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AddButton() {
  const navigate = useNavigate();
  const [isMembershipSaleOpen, setIsMembershipSaleOpen] = useState(false);

  const handleAddAppointment = () => {
    navigate("/admin/bookings");
  };

  const handleAddSale = () => {
    setIsMembershipSaleOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleAddAppointment}>
            <Calendar className="mr-2 h-4 w-4" />
            Add Appointment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddSale}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add Sale
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MembershipSale
        open={isMembershipSaleOpen}
        onClose={() => setIsMembershipSaleOpen(false)}
      />
    </>
  );
}
