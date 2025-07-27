import React, { useEffect, useState, useRef } from "react";
import { StaffSideNav } from "./StaffSideNav";
import { ProfileSection } from "./sections/ProfileSection";
import { LocationsSection } from "./sections/LocationsSection";
import { ServicesSection } from "./sections/ServicesSection";
import { CommissionsSection } from "./sections/CommissionsSection";
import { CompensationSettings } from "./pay/CompensationSettings";
import { EmploymentTypeValidator } from "./EmploymentTypeValidator";
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
import { cn } from "@/lib/utils";

// Define the form schema
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
  skills: z.array(z.string()).optional().default([]),
  locations: z.array(z.string()).min(1, "At least one location is required"),
  service_commission_enabled: z.boolean().default(false),
  commission_type: z.enum(["flat", "tiered", "template"]).optional().nullable().transform((val) => val || undefined),
  service_commissions: z.record(z.string(), z.number()).optional(),
  global_commission_percentage: z.number().min(0).max(100).optional(),

  // Updated compensation fields
  compensation: z
    .object({
      compensation_type: z.enum(["monthly", "hourly"]).default("monthly"),
      monthly_salary: z.number().min(0, "Salary must be greater than 0").optional(),
      hourly_rate: z.number().min(0, "Hourly rate must be greater than 0").optional(),
      effective_from: z.date(),
    })
    .optional()
    .refine(
      (data) => {
        if (!data) return true;
        if (data.compensation_type === "monthly") {
          return data.monthly_salary !== undefined && data.monthly_salary > 0;
        } else {
          return data.hourly_rate !== undefined && data.hourly_rate > 0;
        }
      },
      {
        message: "Please provide either monthly salary or hourly rate based on compensation type"
      }
    )
}).refine((data) => {
  // If service commission is enabled, commission_type is required
  if (data.service_commission_enabled) {
    return data.commission_type !== null && data.commission_type !== undefined;
  }
  // If service commission is disabled, commission_type should be optional
  return true;
}, {
  message: "Commission type is required when service commission is enabled",
  path: ["commission_type"],
});

type StaffFormData = z.infer<typeof formSchema>;

interface FormRef {
  submit: () => Promise<void>;
  // Add any other form methods that might be needed
}

interface StaffNewLayoutProps {
  initialData?: any;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
  employeeId?: string;
  isSubmitting?: boolean;
  use2FactorVerification?: boolean;
  isMobile?: boolean;
  formRef?: React.MutableRefObject<FormRef>;
}

export function StaffNewLayout({
  initialData,
  onSubmit,
  onCancel,
  employeeId,
  isSubmitting = false,
  use2FactorVerification = false,
  isMobile = false,
  formRef,
}: StaffNewLayoutProps & { formRef?: React.MutableRefObject<any> }) {
  const [activeSection, setActiveSection] = useState("profile");
  const [images, setImages] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isPhoneCheckLoading, setIsPhoneCheckLoading] = useState(false);
  const [sectionsWithErrors, setSectionsWithErrors] = useState<string[]>([]);
  const [errorCounts, setErrorCounts] = useState<Record<string, number>>({});
  const [isServicesRequired, setIsServicesRequired] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{
    name: string;
    code: string;
    flag: string;
  }>({
    name: "India",
    code: "+91",
    flag: "🇮🇳",
  });
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      photo_url: "",
      status: "active",
      employment_type_id: "",
      skills: [],
      locations: [],
    },
  });

  // Expose form methods through ref
  React.useEffect(() => {
    if (formRef) {
      formRef.current = form;
    }
  }, [formRef, form]);

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employment types from the database
  const { data: employmentTypes } = useQuery({
    queryKey: ["employmentTypes"],
    queryFn: async () => {
      try {
        // Use any type since employment_types may not be properly typed in Database types
        const { data, error } = await supabase
          .from("employment_types" as any)
          .select("*")
          .order("name");

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching employment types:", error);
        return [];
      }
    },
  });
  useEffect(() => {
    if (initialData) {
      // Parse the phone number to get country code and local number separately
      const phoneWithPlus = initialData.phone?.startsWith("+")
        ? initialData.phone
        : "+" + initialData.phone;
      const { countryCode, phoneNumber } = parsePhoneNumber(phoneWithPlus);
      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: phoneNumber, // Just the local part without country code
        photo_url: initialData.photo_url || "",
        status: initialData.status || "active",
        employment_type_id: initialData.employment_type_id || "",
        skills:
          initialData.employee_skills?.map((s: any) => s.service_id) || [],
        locations:
          initialData.employee_locations?.map((l: any) => l.location_id) || [],
        service_commission_enabled:
          initialData.service_commission_enabled || false,
        commission_type: initialData.commission_type,
      });

      // Set the selected country based on the detected country code
      if (countryCode) {
        const matchedCountry = countryCodes.find((c) => c.code === countryCode);
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
        }
      }

      if (initialData.photo_url) {
        setImages([initialData.photo_url]);
      }

      setSelectedSkills(
        initialData.employee_skills?.map((s: any) => s.service_id) || []
      );
      setSelectedLocations(
        initialData.employee_locations?.map((l: any) => l.location_id) || []
      );
    }
  }, [initialData, form]);
  useEffect(() => {
    // Make sure to trigger validation when locations change
    form.setValue("locations", selectedLocations, { shouldValidate: true });

    // If there are selected locations, clear any location errors
    if (selectedLocations.length > 0) {
      form.clearErrors("locations");
    }
  }, [selectedLocations, form]);
  useEffect(() => {
    if (!form.formState.isSubmitting) {
      form.setValue("skills", selectedSkills, { shouldTouch: false });
    }
  }, [selectedSkills, form]);

  // Update the sections with errors whenever form state changes
  useEffect(() => {
    if (form.formState.isSubmitted) {
      const errorSections = checkSectionsWithErrors();
      setSectionsWithErrors(errorSections);
    }
  }, [form.formState.errors, form.formState.isSubmitted]);
  // Special effect to specifically watch the employment_type_id field
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "employment_type_id") {
        // If the field is empty and the form has been submitted at least once
        if (
          (!value.employment_type_id ||
            value.employment_type_id.length === 0) &&
          form.formState.isSubmitted
        ) {
          setSectionsWithErrors((prev) => {
            if (!prev.includes("profile")) {
              return [...prev, "profile"];
            }
            return prev;
          });
          setErrorCounts((prev) => ({
            ...prev,
            profile: (prev.profile || 0) + 1,
          }));
        }
        // If the field is valid and profile is in the error list, update it
        else if (
          value.employment_type_id &&
          value.employment_type_id.length > 0
        ) {
          setSectionsWithErrors((prev) =>
            prev.filter((section) => section !== "profile")
          );
          setErrorCounts((prev) => {
            const newCounts = { ...prev };
            if (newCounts.profile && newCounts.profile > 0) {
              newCounts.profile -= 1;
              if (newCounts.profile === 0) {
                delete newCounts.profile;
              }
            }
            return newCounts;
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch, form.formState.isSubmitted]);

  const checkPhoneExists = async (phone: string) => {
    if (!phone || phone.length < 10) return false;

    // Skip check if we're editing and the phone hasn't changed
    if (initialData && employeeId) {
      // Get the original phone without the country code
      const phoneWithPlus = initialData.phone?.startsWith("+")
        ? initialData.phone
        : "+" + initialData.phone;
      const { phoneNumber: originalPhoneNumber } =
        parsePhoneNumber(phoneWithPlus);

      // If we're just updating other fields and the phone number hasn't changed
      if (phone === originalPhoneNumber) {
        return false; // Skip the existence check - this is the same phone number
      }
    }

    // Remove + from country code when checking
    const formattedPhone = `${selectedCountry.code.replace("+", "")}${phone}`;

    try {
      setIsPhoneCheckLoading(true);

      // Check if this phone exists in other employees
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("phone", formattedPhone);

      if (employeeError) throw employeeError;

      // Check if this phone exists in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone_number", formattedPhone);

      if (profileError) throw profileError;

      // For an existing employee (update case), exclude the current employee from the check
      const employeeExists = employeeId
        ? employeeData.some((e) => e.id !== employeeId)
        : employeeData.length > 0;

      const profileExists = profileData.length > 0;

      if (employeeExists || profileExists) {
        toast.error("Phone number already exists in the system");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking phone existence:", error);
      return false;
    } finally {
      setIsPhoneCheckLoading(false);
    }
  };
  // Helper function to check which sections have validation errors and count them
  const checkSectionsWithErrors = () => {
    const errors = form.formState.errors;
    console.log("Checking sections with errors. Current form errors:", errors);
    
    const errorSections: string[] = [];
    const counts: Record<string, number> = {};

    // Profile section errors (name, email, phone, employment_type_id)
    let profileErrorCount = 0;
    if (errors.name) {
      console.log("Name error:", errors.name);
      profileErrorCount++;
    }
    if (errors.email) {
      console.log("Email error:", errors.email);
      profileErrorCount++;
    }
    if (errors.phone) {
      console.log("Phone error:", errors.phone);
      profileErrorCount++;
    }
    if (errors.employment_type_id) {
      console.log("Employment type error:", errors.employment_type_id);
      profileErrorCount++;
    }

    if (profileErrorCount > 0) {
      console.log("Adding profile to error sections, error count:", profileErrorCount);
      errorSections.push("profile");
      counts["profile"] = profileErrorCount;
    }

    // Services section errors - only count if the selected employment type requires services
    if (errors.skills && isServicesRequired) {
      console.log("Skills error:", errors.skills, "Services required:", isServicesRequired);
      errorSections.push("services");
      counts["services"] = 1; // For array fields, we count it as 1 error
    }

    // Locations section errors
    if (errors.locations) {
      console.log("Locations error:", errors.locations);
      errorSections.push("locations");
      counts["locations"] = 1; // For array fields, we count it as 1 error
    }    // Commission section errors - check for any commission-related field errors
    let commissionErrorCount = 0;
    
    // Check for commission_type errors (this field might not have a ref if not rendered)
    if (errors.commission_type) {
      console.log("Commission type error:", errors.commission_type);
      commissionErrorCount++;
    }
    
    // Check for service_commission_enabled errors
    if (errors.service_commission_enabled) {
      console.log("Service commission enabled error:", errors.service_commission_enabled);
      commissionErrorCount++;
    }
    
    // Check for global_commission_percentage errors
    if (errors.global_commission_percentage) {
      console.log("Global commission error:", errors.global_commission_percentage);
      commissionErrorCount++;
    }
    
    // Check for service_commissions errors
    if (errors.service_commissions) {
      console.log("Service commissions error:", errors.service_commissions);
      commissionErrorCount++;
    }    // The commission_type validation is now handled by the schema's refine method
    // No need for manual error checking here

    if (commissionErrorCount > 0) {
      console.log("Adding commissions to error sections, error count:", commissionErrorCount);
      errorSections.push("commissions");
      counts["commissions"] = commissionErrorCount;
    }

    // Settings section errors
    if (false) {
      // Placeholder to maintain structure, employment_type_id moved to profile
      errorSections.push("settings");
      counts["settings"] = 1;
    }

    // Update the error counts state
    setErrorCounts(counts);
    
    console.log("Final error sections:", errorSections);
    console.log("Final error counts:", counts);

    return errorSections;
  };// Handle form submission
  const handleFormSubmit = React.useCallback(
    async (data: StaffFormData) => {
      if (isSubmitting || form.formState.isSubmitting) {
        console.log("Form submission prevented - already submitting");
        return;
      }

      try {
        form.formState.isSubmitting = true;

        // Format the phone number with country code, removing any leading + sign
        const phoneWithCountryCode =
          selectedCountry.code + data.phone.replace(/^\+/, "");

        // Prepare the final data with formatted phone
        const finalData = {
          ...data,
          phone: phoneWithCountryCode.replace(/^\+/, ""),
        };

        // Pass the data to the parent component
        onSubmit(finalData);
      } catch (error) {
        console.error("Error in handleFormSubmit:", error);
      }
    },
    [isSubmitting, form, onSubmit, selectedCountry]
  );

  const handleLocationChange = (locationId: string) => {
    const newLocations = selectedLocations.includes(locationId)
      ? selectedLocations.filter((id) => id !== locationId)
      : [...selectedLocations, locationId];

    // Batch all state updates together
    const hasLocations = newLocations.length > 0;
    setSelectedLocations(newLocations);

    // Update form state
    form.setValue("locations", newLocations, {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (hasLocations) {
      form.clearErrors("locations");
      setSectionsWithErrors((prev) =>
        prev.filter((section) => section !== "locations")
      );
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only keep digits
    const value = e.target.value.replace(/\D/g, "");
    form.setValue("phone", value);
  };

  // Helper function to remove a section from the error sections list
  const clearSectionError = (sectionId: string) => {
    setSectionsWithErrors((prev) => prev.filter((s) => s !== sectionId));
    setErrorCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[sectionId];
      return newCounts;
    });
  };
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
      case "compensation":
        return (
          <CompensationSettings
            employeeId={employeeId || ""}
            onCompensationChange={(data) => {
              form.setValue("compensation", data);
            }}
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
  }; // Function to check if employment type has perform_services permission
  const checkPerformServicesPermission = (employmentTypeId: string) => {
    if (!employmentTypeId || !employmentTypes) return false;

    const selectedType = employmentTypes.find(
      (type: any) => type.id === employmentTypeId
    );
    // Use optional chaining and type assertion to avoid TypeScript errors
    const permissions = (selectedType as any)?.permissions;
    const hasPermission = permissions
      ? permissions.includes("perform_services")
      : false;

    console.log("Employment Type:", (selectedType as any)?.name);
    console.log("Permissions:", permissions);
    console.log("Has perform_services permission:", hasPermission);

    return hasPermission;
  };
  // Update services required status when employment type changes
  useEffect(() => {
    const employmentTypeId = form.getValues("employment_type_id");
    const hasPerformServices = checkPerformServicesPermission(employmentTypeId);

    console.log("Employment type ID:", employmentTypeId);
    console.log("Services required:", hasPerformServices);

    setIsServicesRequired(hasPerformServices);

    // When the selected employment type changes, update the form validation
    if (hasPerformServices) {
      // If the employment type has perform_services permission, validate services
      const skills = form.getValues("skills") || [];
      console.log("Current skills:", skills);

      if (skills.length === 0) {
        // Set error only if skills array is empty
        console.log("Setting skills validation error");
        form.setError("skills", {
          type: "manual",
          message: "At least one service is required",
        });
      }
    } else {
      // If not required, clear any existing error
      console.log("Clearing skills validation");
      form.clearErrors("skills");
    }
  }, [form.watch("employment_type_id"), employmentTypes]); // This effect was causing a duplicate with the one above, so we removed it

  // Watch for skills changes when services are required
  useEffect(() => {
    if (!isServicesRequired) return;

    const subscription = form.watch((value) => {
      const skills = value.skills || [];

      if (skills.length === 0) {
        form.setError("skills", {
          type: "manual",
          message: "At least one service is required",
        });
      } else {
        form.clearErrors("skills");
      }
    });
    return () => subscription.unsubscribe();
  }, [isServicesRequired]);

  // Create refs for all section content elements so we can control them separately
  const contentRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = {
    profile: React.useRef<HTMLDivElement>(null),
    services: React.useRef<HTMLDivElement>(null),

    locations: React.useRef<HTMLDivElement>(null),
    commissions: React.useRef<HTMLDivElement>(null),
    settings: React.useRef<HTMLDivElement>(null),
  }; // This function handles section changes with controlled scrolling
  const handleSectionChange = (sectionId: string) => {
    // Update the active section state
    setActiveSection(sectionId);

    // Reset scroll position
    if (contentRef.current) {
      window.requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      });
    }
  };

  const handleSubmit = async (data: StaffFormData) => {
    if (isSubmitting || isFormSubmitting) {
      console.log("Form submission prevented - already submitting");
      return;
    }

    setIsFormSubmitting(true);
    try {
      const phoneWithCountryCode =
        selectedCountry.code + data.phone.replace(/^\+/, "");

      const finalData = {
        ...data,
        phone: phoneWithCountryCode.replace(/^\+/, ""),
      };

      await onSubmit(finalData);
    } catch (error) {
      console.error("Form submission error:", error);
      throw error;
    } finally {
      setIsFormSubmitting(false);
    }
  };  const handleButtonClick = async () => {
    console.log("=== handleButtonClick called ===");
    
    // Get form data without submitting the form
    const data = form.getValues();
    console.log("Form data:", data);
    
    const isValid = await form.trigger(); // Validate all fields
    console.log("Form validation result:", isValid);
    console.log("Form errors after trigger:", form.formState.errors);
    
    if (!isValid) {
      console.log("Form validation failed");
      
      // Wait a brief moment for React to update the form state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Show validation errors
      const errorSections = checkSectionsWithErrors();
      setSectionsWithErrors(errorSections);
      console.log("Error sections:", errorSections);
      console.log("Form errors when checking sections:", form.formState.errors);
      return;
    }

    if (isSubmitting || isFormSubmitting) {
      console.log('Form submission prevented - already submitting');
      return;
    }

    console.log("Starting form submission...");
    setIsFormSubmitting(true);
    try {
      const phoneWithCountryCode = selectedCountry.code + data.phone.replace(/^\+/, "");
      
      const finalData = {
        ...data,
        phone: phoneWithCountryCode.replace(/^\+/, ""),
      };
      
      console.log("Final data to submit:", finalData);
      await onSubmit(finalData);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Store the handler in a ref so StaffDialog can access it
  React.useEffect(() => {
    if (formRef) {
      formRef.current = {
        ...form,
        submit: handleButtonClick
      };
    }
  }, [formRef, form, handleButtonClick]);  return (
    <Form {...form}>
      {/* Include the EmploymentTypeValidator to handle conditional validation */}
      <EmploymentTypeValidator
        form={form}
        setSectionsWithErrors={setSectionsWithErrors}
        setErrorCounts={setErrorCounts}
        employmentTypes={employmentTypes || []}
      />
      <div
        id="staff-form"
        className={cn("space-y-6 h-full flex flex-col", {
          "pb-20": isMobile,
        })}
      >
        <div
          className={`flex flex-1 overflow-hidden ${
            isMobile ? "flex-col" : "flex-row"
          }`}
        >
          {isMobile ? (
            <div className="border-b border-gray-200 mb-4 overflow-x-auto">
              <div className="flex py-2 px-4 space-x-4">
                {[
                  "profile",
                  "services",
                  "locations",
                  "commissions",
                  "compensation",
                ].map((section) => (
                  <button
                    key={section}
                    className={`px-3 py-2 text-sm whitespace-nowrap transition-colors rounded ${
                      activeSection === section
                        ? "bg-gray-100 text-gray-800 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    } ${
                      sectionsWithErrors.includes(section) && !isMobile
                        ? "border-red-500 border"
                        : ""
                    }`}
                    onClick={() => handleSectionChange(section)}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                    {sectionsWithErrors.includes(section) && (
                      <span className="ml-1 text-red-500">•</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <StaffSideNav
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              sectionsWithErrors={sectionsWithErrors}
              errorCounts={errorCounts}
            />
          )}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto h-full"
            style={{
              overflowAnchor: "none",
            }} /* Prevent browser auto-scrolling */
          >
            {renderActiveSection()}          </div>
        </div>
      </div>
    </Form>
  );
}

// Export FormRef type for parent component usage
export type { FormRef };

// Helper function to check if the selected employment type has perform_services permission
function hasPerformServicesPermission(
  employmentTypeId: string,
  types: any[]
): boolean {
  if (!employmentTypeId || !types || types.length === 0) return false;
  const employmentType = types.find((type) => type.id === employmentTypeId);
  return employmentType?.permissions?.includes("perform_services") || false;
}
