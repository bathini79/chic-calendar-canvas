
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  Percent, 
  Tag, 
  Award, 
  UserCheck 
} from "lucide-react";

export default function Sales() {
  return (
    <div className="container py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sales Management</h1>
        <p className="text-muted-foreground">Manage payment methods, taxes, and promotional programs.</p>
      </div>

      <Tabs defaultValue="payment-methods" className="mb-6">
        <TabsList>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="tax-rates">Tax Rates</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Payment Methods</h3>
              <p className="text-muted-foreground text-sm">
                Configure payment options for your business, including credit cards, cash, and digital payments.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <Percent className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Tax Rates</h3>
              <p className="text-muted-foreground text-sm">
                Set up tax rates for different services, products, and locations.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Coupons</h3>
              <p className="text-muted-foreground text-sm">
                Create and manage promotional coupons and discount codes for your customers.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Loyalty Program</h3>
              <p className="text-muted-foreground text-sm">
                Set up and manage your customer loyalty program with points, rewards, and tiers.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Memberships</h3>
              <p className="text-muted-foreground text-sm">
                Create and manage subscription-based membership plans for your business.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
