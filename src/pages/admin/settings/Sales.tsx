
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CreditCard, Gift, Award, Tag, ArrowRight, PercentIcon, BadgePercent, CircleDollarSign } from "lucide-react";

export default function Sales() {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (subPath: string) => {
    return path.includes(subPath);
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sales Configuration</h1>
        <p className="text-muted-foreground">
          Configure payment methods, taxes, coupons, loyalty program and memberships.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/admin/settings/sales/payment-methods">
          <Card
            className={`h-full hover:shadow-md transition-shadow cursor-pointer ${
              isActive("payment-methods") ? "border-primary" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Payment Methods</h3>
                <p className="text-muted-foreground text-sm">
                  Configure payment methods, payment terminals and payment policies.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm">
                    Configure <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/settings/sales/tax-rates">
          <Card
            className={`h-full hover:shadow-md transition-shadow cursor-pointer ${
              isActive("tax-rates") ? "border-primary" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <CircleDollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Tax Rates</h3>
                <p className="text-muted-foreground text-sm">
                  Configure tax rates for services, products and packages.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm">
                    Configure <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/settings/sales/coupons">
          <Card
            className={`h-full hover:shadow-md transition-shadow cursor-pointer ${
              isActive("coupons") ? "border-primary" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <BadgePercent className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Coupons</h3>
                <p className="text-muted-foreground text-sm">
                  Create and manage discount coupons for your services and packages.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm">
                    Configure <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/settings/sales/memberships">
          <Card
            className={`h-full hover:shadow-md transition-shadow cursor-pointer ${
              isActive("memberships") ? "border-primary" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Memberships</h3>
                <p className="text-muted-foreground text-sm">
                  Configure membership programs with discounts and special benefits.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm">
                    Configure <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/settings/sales/loyalty-program">
          <Card
            className={`h-full hover:shadow-md transition-shadow cursor-pointer ${
              isActive("loyalty-program") ? "border-primary" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Loyalty Program</h3>
                <p className="text-muted-foreground text-sm">
                  Set up a rewards program for returning customers.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm">
                    Configure <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/settings/sales/gift-cards">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Gift Cards</h3>
                <p className="text-muted-foreground text-sm">
                  Create gift cards that customers can purchase for others.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm">
                    Configure <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Outlet />
    </div>
  );
}
