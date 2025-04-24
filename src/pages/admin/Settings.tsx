import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsIcon, Globe, Tag, Building, Users, FileText, CreditCard, Gift, Award, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
  return (
    <div className="container py-4 md:py-6 px-4 max-w-6xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Workspace settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage settings for your business.</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <Tabs defaultValue="settings" className="mb-4 md:mb-6 min-w-[400px]">
        <TabsList className="flex flex-nowrap justify-start bg-transparent">
        <TabsTrigger
              value="settings"
              className="text-sm md:text-base px-4 py-2 text-black hover:text-gray-500 focus:bg-black focus:text-white data-[state=active]:bg-black data-[state=active]:text-white"
            >
              Settings
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <Link to="/admin/settings/business-setup">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-3 md:mb-4">
                  <Building className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold">Business setup</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Customize business details, manage locations, and client referral sources.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/settings/third-party">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-3 md:mb-4">
                  <Phone className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold">Third party configuration</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Configure Twilio and other third-party integrations.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-3 md:mb-4">
                <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold">Scheduling</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Set your availability, manage bookable resources and online booking preferences.
              </p>
            </div>
          </CardContent>
        </Card>

        <Link to="/admin/settings/sales">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-3 md:mb-4">
                  <Tag className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold">Sales</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Configure payment methods, taxes, coupons, loyalty program and memberships.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col h-full">
              <div className="mb-3 md:mb-4">
                <Building className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold">Billing</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage invoices, text messages, add-ons and billing.
              </p>
            </div>
          </CardContent>
        </Card>

        <Link to="/admin/settings/team">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col h-full">
                <div className="mb-3 md:mb-4">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold">Team</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Manage permissions, compensation and time-off.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
