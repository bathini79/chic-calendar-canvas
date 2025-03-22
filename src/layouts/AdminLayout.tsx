
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { MembershipSale } from "@/components/admin/sales/MembershipSale";

export function AdminLayout() {
  const navigate = useNavigate();
  const [isMembershipSaleOpen, setIsMembershipSaleOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 relative">
        <div className="fixed top-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-full h-12 w-12 shadow-lg">
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => navigate("/admin/bookings")}
                className="cursor-pointer"
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>Add Appointment</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsMembershipSaleOpen(true)}
                className="cursor-pointer"
              >
                <Tag className="mr-2 h-4 w-4" />
                <span>Add Sale</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Outlet />
        
        {isMembershipSaleOpen && (
          <MembershipSale 
            isOpen={isMembershipSaleOpen} 
            onClose={() => setIsMembershipSaleOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
