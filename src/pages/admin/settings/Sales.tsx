
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Memberships from "./Memberships";
import LoyaltyProgram from "./LoyaltyProgram";

// Placeholder components for sections without dedicated pages
const PaymentMethods = () => (
  <div className="bg-muted/50 p-6 rounded-lg">
    <h1 className="text-2xl font-bold mb-4">Payment Methods</h1>
    <p className="text-muted-foreground">
      Configure payment methods for your business here.
    </p>
  </div>
);

const TaxRates = () => (
  <div className="bg-muted/50 p-6 rounded-lg">
    <h1 className="text-2xl font-bold mb-4">Tax Rates</h1>
    <p className="text-muted-foreground">
      Configure tax rates for your business here.
    </p>
  </div>
);

const Coupons = () => (
  <div className="bg-muted/50 p-6 rounded-lg">
    <h1 className="text-2xl font-bold mb-4">Coupons</h1>
    <p className="text-muted-foreground">
      Manage discount coupons for your business here.
    </p>
  </div>
);

const GiftCards = () => (
  <div className="bg-muted/50 p-6 rounded-lg">
    <h1 className="text-2xl font-bold mb-4">Gift Cards</h1>
    <p className="text-muted-foreground">
      Manage gift cards for your business here.
    </p>
  </div>
);

export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract the current section from URL path or default to payment-methods
  const [activeSection, setActiveSection] = useState<string>("payment-methods");
  
  // Update active section whenever location changes
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('memberships')) {
      setActiveSection("memberships");
    } else if (path.includes('loyalty-program')) {
      setActiveSection("loyalty-program");
    } else if (path.includes('payment-methods')) {
      setActiveSection("payment-methods");
    } else if (path.includes('tax-rates')) {
      setActiveSection("tax-rates");
    } else if (path.includes('coupons')) {
      setActiveSection("coupons");
    } else if (path.includes('gift-cards')) {
      setActiveSection("gift-cards");
    }
  }, [location]);

  // Handle section changes
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Update URL to reflect the section but stay on the same page
    navigate(`/admin/settings/sales/${section}`, { replace: true });
  };

  // Render the appropriate component based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "memberships":
        return <Memberships />;
      case "loyalty-program":
        return <LoyaltyProgram />;
      case "payment-methods":
        return <PaymentMethods />;
      case "tax-rates":
        return <TaxRates />;
      case "coupons":
        return <Coupons />;
      case "gift-cards":
        return <GiftCards />;
      default:
        return (
          <div className="bg-muted/50 p-6 rounded-lg flex flex-col items-center justify-center min-h-[300px]">
            <p className="text-muted-foreground text-center">
              Select a sales configuration option from the sidebar to get started.
            </p>
          </div>
        );
    }
  };

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
                onClick={() => handleSectionChange("payment-methods")}
              >
                <span>Payment methods</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "tax-rates" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("tax-rates")}
              >
                <span>Tax rates</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "coupons" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("coupons")}
              >
                <span>Coupons</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "memberships" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("memberships")}
              >
                <span>Memberships</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "loyalty-program" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("loyalty-program")}
              >
                <span>Loyalty program</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "gift-cards" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("gift-cards")}
              >
                <span>Gift cards</span>
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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
