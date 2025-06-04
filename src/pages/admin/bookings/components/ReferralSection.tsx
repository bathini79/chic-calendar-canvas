import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Users, X, Search, InfoIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { UseReferralInCheckoutResult } from '../hooks/useReferralInCheckout';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface ReferralSectionProps {
  referralData: UseReferralInCheckoutResult;
}

const ReferralSection: React.FC<ReferralSectionProps> = ({ referralData }) => {
  const {
    isReferralEnabled,
    isReferralApplicable,
    referrers,
    selectedReferrerId,
    setSelectedReferrerId,
    isLoadingReferrers,
    potentialCashback,
    searchTerm,
    setSearchTerm,
    searchReferrers
  } = referralData;

  if (!isReferralEnabled || !isReferralApplicable) {
    return null;
  }
  return (
    <Card className="mt-4 border-blue-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            <CardTitle className="text-base">Referred By</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 ml-1.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Select who referred this new customer. The referrer will receive cashback when this appointment is completed.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {potentialCashback > 0 && selectedReferrerId && (
            <span className="text-sm text-green-600 font-semibold">
              Cashback: ₹{potentialCashback.toFixed(2)}
            </span>
          )}
        </div>
        <CardDescription className="text-xs">
          Select who referred this new customer
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 space-y-4">
        {/* Already selected referrer */}
        {selectedReferrerId && referrers.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md border border-blue-100">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 bg-blue-600 text-primary-foreground">
                {referrers[0].full_name?.charAt(0) || 'C'}
              </Avatar>
              <div className="ml-2">
                <div className="text-sm font-medium">{referrers[0].full_name}</div>
                <div className="text-xs text-muted-foreground">{referrers[0].phone_number}</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedReferrerId(null)}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}        {/* Search for referrers */}
        {!selectedReferrerId && (
          <>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                className="ps-10 pr-20"
                placeholder="Search customer by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                className="absolute end-0 top-0 h-full rounded-s-none"
                onClick={searchReferrers} 
                disabled={isLoadingReferrers || searchTerm.length < 3}
              >
                {isLoadingReferrers ? (
                  <LoaderCircle className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            {referrers.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {referrers.map(referrer => (
                  <div
                    key={referrer.id}
                    className="flex items-center justify-between p-3 hover:bg-blue-50 border-b last:border-b-0 cursor-pointer transition-colors"
                    onClick={() => setSelectedReferrerId(referrer.id)}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3 bg-blue-600 text-primary-foreground">
                        {referrer.full_name?.charAt(0) || 'C'}
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{referrer.full_name}</div>
                        <div className="text-xs text-muted-foreground">{referrer.phone_number}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchTerm && !isLoadingReferrers && referrers.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4 bg-gray-50 rounded-md border">
                No customers found matching "<span className="font-medium">{searchTerm}</span>".<br/>
                Try a different search term.
              </div>
            )}
          </>
        )}        {selectedReferrerId && (
          <div className="bg-green-50 border border-green-100 rounded-md p-3 text-sm">
            <div className="flex items-center text-green-700 font-medium mb-1">
              <Users className="h-4 w-4 mr-2" />
              Cashback: ₹{potentialCashback.toFixed(2)}
            </div>
            <p className="text-xs text-green-600">
              The referrer will receive ₹{potentialCashback.toFixed(2)} cashback when this appointment is completed.
            </p>
          </div>
        )}
        
        {!selectedReferrerId && (
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mt-2">
            <p className="text-xs text-blue-600">
              When you select a referrer, they will receive cashback when this appointment is completed. This encourages existing customers to refer new clients to your business.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
