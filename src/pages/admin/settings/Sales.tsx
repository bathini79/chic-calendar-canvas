
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Sales() {
  const location = useLocation();
  const path = location.pathname;
  
  const [activeSection, setActiveSection] = useState<string>(
    path.includes('memberships') ? "memberships" : 
    path.includes('loyalty-program') ? "loyalty-program" : 
    path.includes('payment-methods') ? "payment-methods" : 
    path.includes('tax-rates') ? "tax-rates" :
    path.includes('coupons') ? "coupons" :
    path.includes('gift-cards') ? "gift-cards" : "payment-methods"
  );

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/admin/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          Workspace settings • Sales configuration
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-0 pt-6">
              <div className="px-4 pb-2">
                <h2 className="text-lg font-medium">Sales configuration</h2>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "payment-methods" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("payment-methods")}
              >
                <Link to="/admin/settings/sales/payment-methods" className="block">
                  <span>Payment methods</span>
                </Link>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "tax-rates" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("tax-rates")}
              >
                <Link to="/admin/settings/sales/tax-rates" className="block">
                  <span>Tax rates</span>
                </Link>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "coupons" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("coupons")}
              >
                <Link to="/admin/settings/sales/coupons" className="block">
                  <span>Coupons</span>
                </Link>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "memberships" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("memberships")}
              >
                <Link to="/admin/settings/sales/memberships" className="block">
                  <span>Memberships</span>
                </Link>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "loyalty-program" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("loyalty-program")}
              >
                <Link to="/admin/settings/sales/loyalty-program" className="block">
                  <span>Loyalty program</span>
                </Link>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "gift-cards" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("gift-cards")}
              >
                <Link to="/admin/settings/sales/gift-cards" className="block">
                  <span>Gift cards</span>
                </Link>
              </div>

              <Separator className="my-4" />
              <div className="px-4 py-2 font-medium">Shortcuts</div>

              <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                <span>Service menu</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                <span>Product list</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                <span>Client list</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Outlet />
          {path === "/admin/settings/sales" && (
            <div className="bg-muted/50 p-6 rounded-lg flex flex-col items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground text-center">
                Select a sales configuration option from the sidebar to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
