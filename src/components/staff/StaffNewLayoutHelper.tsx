import React from "react";
import { StaffSideNav } from "./StaffSideNav";
import { ProfileSection } from "./sections/ProfileSection";
import { LocationsSection } from "./sections/LocationsSection";
import { ServicesSection } from "./sections/ServicesSection";
import { CommissionsSection } from "./sections/CommissionsSection";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { countryCodes, parsePhoneNumber } from "@/lib/country-codes";
import { toast } from "sonner";

// Define the form schema with commission fields
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .transform((val) => val || ""),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  photo_url: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  employment_type_id: z.string().min(1, "Employment type is required"),
  // Skills is conditionally required based on employment_type having perform_services permission
  skills: z.array(z.string()).optional().default([]),
  locations: z.array(z.string()).min(1, "At least one location is required"),
  // Commission fields  commission_type: z.enum(["flat", "tiered", "none", "template"]).optional(),
  service_commissions: z.record(z.string(), z.number()).optional(),
  global_commission_percentage: z.number().min(0).max(100).optional(),
});

export type StaffFormData = z.infer<typeof formSchema>;

export interface StaffNewLayoutProps {
  initialData?: any;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
  employeeId?: string;
  isSubmitting?: boolean;
  use2FactorVerification?: boolean;
  isMobile?: boolean;
}

// Example renderActiveSection function that includes the CommissionsSection
/*
const renderActiveSection = () => {
  switch (activeSection) {
    case "profile":
      return (
        <ProfileSection
          form={form}
          images={images}
          setImages={setImages}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          handlePhoneChange={handlePhoneChange}
          employmentTypes={employmentTypes || []}
          clearSectionError={clearSectionError}
          isMobile={isMobile}
        />
      );
    case "commissions":
      return (
        <CommissionsSection
          form={form}
          employeeId={employeeId}
          isMobile={isMobile}
        />
      );
    case "services":
      return (
        <ServicesSection
          form={form}
          selectedSkills={selectedSkills}
          setSelectedSkills={setSelectedSkills}
          employmentTypes={employmentTypes || []}
          isMobile={isMobile}
        />
      );
    case "locations":
      return (
        <LocationsSection
          form={form}
          locations={locations || []}
          selectedLocations={selectedLocations}
          handleLocationChange={handleLocationChange}
          isMobile={isMobile}
        />
      );
    default:
      return (
        <ProfileSection
          form={form}
          images={images}
          setImages={setImages}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          handlePhoneChange={handlePhoneChange}
          employmentTypes={employmentTypes || []}
          clearSectionError={clearSectionError}
          isMobile={isMobile}
        />
      );
  }
};
*/
