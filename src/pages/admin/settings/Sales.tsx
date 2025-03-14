
import React, { useState } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Outlet } from "react-router-dom";
import { 
  CreditCard, 
  Gift, 
  Award, 
  Tag, 
  CircleDollarSign, 
  BadgePercent 
} from "lucide-react";

export default function Sales() {
  const location = useLocation();
  const path = location.pathname;
  
  const isPaymentsPage = path.includes('/payment-methods');
  const isTaxRatesPage = path.includes('/tax-rates');
  const isCouponsPage = path.includes('/coupons');
  const isMembershipsPage = path.includes('/memberships');
  const isLoyaltyPage = path.includes('/loyalty-program');
  const isGiftCardsPage = path.includes('/gift-cards');
  
  const [activeSection, setActiveSection] = useState<string>(
    isPaymentsPage ? "payments" : 
    isTaxRatesPage ? "taxes" : 
    isCouponsPage ? "coupons" : 
    isMembershipsPage ? "memberships" : 
    isLoyaltyPage ? "loyalty" : 
    isGiftCardsPage ? "gift-cards" : "payments"
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
            <CardHeader>
              <CardTitle className="text-lg">Sales Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Link to="/admin/settings/sales/payment-methods">
                <div 
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center ${activeSection === "payments" ? "bg-accent" : ""}`}
                  onClick={() => setActiveSection("payments")}
                >
                  <span>Payment Methods</span>
                  <CreditCard className="h-4 w-4" />
                </div>
              </Link>
              
              <Link to="/admin/settings/sales/tax-rates">
                <div 
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center ${activeSection === "taxes" ? "bg-accent" : ""}`}
                  onClick={() => setActiveSection("taxes")}
                >
                  <span>Tax Rates</span>
                  <CircleDollarSign className="h-4 w-4" />
                </div>
              </Link>
              
              <Link to="/admin/settings/sales/coupons">
                <div 
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center ${activeSection === "coupons" ? "bg-accent" : ""}`}
                  onClick={() => setActiveSection("coupons")}
                >
                  <span>Coupons</span>
                  <BadgePercent className="h-4 w-4" />
                </div>
              </Link>
              
              <Link to="/admin/settings/sales/memberships">
                <div 
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center ${activeSection === "memberships" ? "bg-accent" : ""}`}
                  onClick={() => setActiveSection("memberships")}
                >
                  <span>Memberships</span>
                  <Gift className="h-4 w-4" />
                </div>
              </Link>
              
              <Link to="/admin/settings/sales/loyalty-program">
                <div 
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center ${activeSection === "loyalty" ? "bg-accent" : ""}`}
                  onClick={() => setActiveSection("loyalty")}
                >
                  <span>Loyalty Program</span>
                  <Award className="h-4 w-4" />
                </div>
              </Link>
              
              <Link to="/admin/settings/sales/gift-cards">
                <div 
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center ${activeSection === "gift-cards" ? "bg-accent" : ""}`}
                  onClick={() => setActiveSection("gift-cards")}
                >
                  <span>Gift Cards</span>
                  <Tag className="h-4 w-4" />
                </div>
              </Link>

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
            <div className="bg-muted/40 rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
              <h2 className="text-xl font-medium mb-2">Sales Configuration</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Configure payment methods, taxes, coupons, loyalty program and memberships to enhance your sales experience.
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link to="/admin/settings/sales/payment-methods">
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
