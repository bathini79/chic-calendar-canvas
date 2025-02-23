import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";

const UnifiedScheduling = () => {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});

  const { data: employees } = useQuery({
    queryKey: ["stylists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employment_type", "stylist")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId]
    );
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylists(prev => ({
      ...prev,
      [itemId]: stylistId
    }));
  };

  const handleContinue = async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error("Please login to continue");
        return;
      }

      // Add services to cart
      for (const serviceId of selectedServices) {
        const { error } = await supabase.from("cart_items").insert({
          customer_id: userId,
          service_id: serviceId,
          status: "pending",
        });
        if (error) throw error;
      }

      // Add packages to cart
      for (const packageId of selectedPackages) {
        const { error } = await supabase.from("cart_items").insert({
          customer_id: userId,
          package_id: packageId,
          status: "pending",
        });
        if (error) throw error;
      }

      navigate("/cart");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Book an Appointment</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <ServiceSelector
            onServiceSelect={handleServiceSelect}
            onPackageSelect={handlePackageSelect}
            onStylistSelect={handleStylistSelect}
            selectedServices={selectedServices}
            selectedPackages={selectedPackages}
            selectedStylists={selectedStylists}
            stylists={employees || []}
          />

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleContinue}
              disabled={selectedServices.length === 0 && selectedPackages.length === 0}
            >
              Continue to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedScheduling;
