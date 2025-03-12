
import React, { useState } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Placeholder components for the sales settings sections
const PaymentMethodsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Payment Methods</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Configure the payment methods your business accepts from customers.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        No payment methods configured yet. Add your first payment method to get started.
      </div>
    </CardContent>
  </Card>
);

const TaxRatesSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Tax Rates</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Set up tax rates for services and products.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        No tax rates configured yet. Add your first tax rate to get started.
      </div>
    </CardContent>
  </Card>
);

const CouponsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Coupons</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Create and manage discount coupons for your customers.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        No coupons created yet. Add your first coupon to get started.
      </div>
    </CardContent>
  </Card>
);

const LoyaltyProgramSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Loyalty Program</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Configure your customer loyalty program to reward repeat customers.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        Loyalty program not configured yet. Set up your loyalty program to get started.
      </div>
    </CardContent>
  </Card>
);

const MembershipsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Memberships</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Create and manage membership plans for your customers.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        No membership plans created yet. Add your first membership plan to get started.
      </div>
    </CardContent>
  </Card>
);

export default function Sales() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>(
    location.pathname.includes('payment-methods') ? "payment-methods" :
    location.pathname.includes('tax-rates') ? "tax-rates" :
    location.pathname.includes('coupons') ? "coupons" :
    location.pathname.includes('loyalty-program') ? "loyalty-program" :
    location.pathname.includes('memberships') ? "memberships" : "payment-methods"
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
          Workspace settings • Sales
        </div>
      </div>

      <Routes>
        <Route path="/" element={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sales</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "payment-methods" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("payment-methods")}
                  >
                    <span>Payment methods</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "tax-rates" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("tax-rates")}
                  >
                    <span>Tax rates</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "coupons" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("coupons")}
                  >
                    <span>Coupons</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "loyalty-program" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("loyalty-program")}
                  >
                    <span>Loyalty program</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "memberships" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("memberships")}
                  >
                    <span>Memberships</span>
                  </div>

                  <Separator className="my-4" />
                  <div className="px-4 py-2 font-medium">Shortcuts</div>

                  <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                    <span>Invoices</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                    <span>Receipts</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                    <span>Gift cards</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              {activeSection === "payment-methods" && <PaymentMethodsSection />}
              {activeSection === "tax-rates" && <TaxRatesSection />}
              {activeSection === "coupons" && <CouponsSection />}
              {activeSection === "loyalty-program" && <LoyaltyProgramSection />}
              {activeSection === "memberships" && <MembershipsSection />}
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
}
