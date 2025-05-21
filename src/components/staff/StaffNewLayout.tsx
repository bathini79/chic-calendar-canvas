import React, { useEffect, useState, useRef } from "react";
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
  // Skills is conditionally required based on employment_type having perform_services permission
  skills: z.array(z.string()).optional().default([]),
  locations: z.array(z.string()).min(1, "At least one location is required"),  // Commission fields  commission_type: z.enum(["flat", "tiered", "none", "template"]).optional(),
  commission_template_id: z.string().optional(),
  service_commissions: z.record(z.string(), z.number()).optional(),
  global_commission_percentage: z.number().min(0).max(100).optional(),
});

type StaffFormData = z.infer<typeof formSchema>;

interface StaffNewLayoutProps {
  initialData?: any;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
  employeeId?: string;
  isSubmitting?: boolean;
  use2FactorVerification?: boolean;
  isMobile?: boolean;
}

export function StaffNewLayout({
  initialData,
  onSubmit,
  onCancel,
  employeeId,
  isSubmitting = false,
  use2FactorVerification = false,
  isMobile = false,
}: StaffNewLayoutProps) {
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
    flag: string;  }>({
    name: "India",
    code: "+91",
    flag: "🇮🇳",
  });
  
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
    form.setValue("skills", selectedSkills);
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
      return false;    } finally {
      setIsPhoneCheckLoading(false);
    }
  }; 
  
  // Helper function to check which sections have validation errors and count them  
  const checkSectionsWithErrors = () => {
    const errors = form.formState.errors;
    const errorSections: string[] = [];
    const counts: Record<string, number> = {}; // Profile section errors (name, email, phone, employment_type_id)
    let profileErrorCount = 0;
    if (errors.name) profileErrorCount++;
    if (errors.email) profileErrorCount++;
    if (errors.phone) profileErrorCount++;
    if (errors.employment_type_id) profileErrorCount++;

    if (profileErrorCount > 0) {
      errorSections.push("profile");
      counts["profile"] = profileErrorCount;
    }

    // Services section errors - only count if the selected employment type requires services
    if (errors.skills && isServicesRequired) {
      errorSections.push("services");
      counts["services"] = 1; // For array fields, we count it as 1 error
    }

    // Locations section errors
    if (errors.locations) {
      errorSections.push("locations");
      counts["locations"] = 1; // For array fields, we count it as 1 error
    }    // Commission section errors
    let commissionErrorCount = 0;
    if (errors.commission_template_id) commissionErrorCount++;
    if (errors.global_commission_percentage) commissionErrorCount++;
    if (errors.service_commissions) commissionErrorCount++;
    
    if (commissionErrorCount > 0) {
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

    return errorSections;
  };
  const handleFormSubmit = async (data: StaffFormData) => {
    // Clear any previous error sections
    setSectionsWithErrors([]);

    // Apply conditional validation before checking form validity
    const employmentTypeId = form.getValues("employment_type_id");
    const hasPerformServices = checkPerformServicesPermission(employmentTypeId);

    // Check if Services should be required
    if (hasPerformServices && (!data.skills || data.skills.length === 0)) {
      form.setError("skills", {
        type: "manual",
        message: "At least one service is required",
      });

      // Determine which sections have errors, including the manual services error
      const errorSections = checkSectionsWithErrors();
      setSectionsWithErrors(errorSections);

      // Navigate to services section if that's where the error is
      if (errorSections.includes("services")) {
        setActiveSection("services");
      } else if (
        errorSections.length > 0 &&
        !errorSections.includes(activeSection)
      ) {
        setActiveSection(errorSections[0]);
      }

      // Show a toast notification
      toast.error("Please select at least one service");
      return;
    }
    console.log("form", form); // Check if the form has other errors
    if (!form.formState.isValid) {
      // Log detailed error information to help debug
      console.log("Form validation state:", form.formState);
      console.log("Form errors:", form.formState.errors);
      console.log("Form values:", form.getValues());
      console.log("Selected locations:", selectedLocations);

      // Fix for locations issue - if locations are selected but form validation fails
      if (selectedLocations.length > 0 && form.formState.errors.locations) {
        // Force update the locations value to ensure it's properly registered
        form.setValue("locations", selectedLocations, { shouldValidate: true });

        // If locations is the only remaining error, and we have selected locations,
        // we should bypass this validation error
        if (
          Object.keys(form.formState.errors).length === 1 &&
          form.formState.errors.locations
        ) {
          // Continue to submission
          const updatedData = {
            ...form.getValues(),
            photo_url: images[0] || null,
            // Remove + from country code when submitting
            phone: `${selectedCountry.code.replace("+", "")}${
              form.getValues().phone
            }`,
          };

          onSubmit(updatedData);
          return;
        }
      }

      // Determine which sections have errors
      const errorSections = checkSectionsWithErrors();
      console.log("Error sections:", errorSections);
      setSectionsWithErrors(errorSections);

      // If there are errors but we're not on an error section, navigate to the first error section
      if (errorSections.length > 0 && !errorSections.includes(activeSection)) {
        setActiveSection(errorSections[0]);
      }

      // Show a toast notification
      toast.error("Please fill in all required fields before continuing");
      return;
    }

    const phoneExists = await checkPhoneExists(data.phone);
    if (phoneExists) {
      // Set the error section to profile since phone is in that section
      setSectionsWithErrors(["profile"]);
      setActiveSection("profile");
      return;
    }

    const updatedData = {
      ...data,
      photo_url: images[0] || null,
      // Remove + from country code when submitting
      phone: `${selectedCountry.code.replace("+", "")}${data.phone}`,
    };

    onSubmit(updatedData);
  };
  const handleLocationChange = (locationId: string) => {
    setSelectedLocations((prev) => {
      const newLocations = prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId];

      // Update form state and trigger validation
      form.setValue("locations", newLocations, { shouldValidate: true });

      // If locations are selected, clear any location errors directly
      if (newLocations.length > 0) {
        form.clearErrors("locations");

        // Clear locations section from sections with errors if it's there
        setSectionsWithErrors((prev) =>
          prev.filter((section) => section !== "locations")
        );
      }

      return newLocations;
    });
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    form.setValue("phone", value);

    // Clear error indicator when user starts typing
    if (value.length >= 10 && sectionsWithErrors.includes("profile")) {
      setSectionsWithErrors((prev) => prev.filter((s) => s !== "profile"));
    }
  };
  // Helper function to remove a section from the error sections list
  const clearSectionError = (sectionId: string) => {
    setSectionsWithErrors((prev) => prev.filter((s) => s !== sectionId));
    setErrorCounts((prev) => {
      const newCounts = { ...prev };      delete newCounts[sectionId];
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
            isMobile={isMobile}          />
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
  };  // Function to check if employment type has perform_services permission
  const checkPerformServicesPermission = (employmentTypeId: string) => {
    if (!employmentTypeId || !employmentTypes) return false;

    const selectedType = employmentTypes.find(
      (type: any) => type.id === employmentTypeId
    );
    // Use optional chaining and type assertion to avoid TypeScript errors
    const permissions = (selectedType as any)?.permissions;
    const hasPermission = permissions ? permissions.includes("perform_services") : false;

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
    });    return () => subscription.unsubscribe();
  }, [isServicesRequired]);
  
  // Create refs for all section content elements so we can control them separately
  const contentRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = {
    profile: React.useRef<HTMLDivElement>(null),
    services: React.useRef<HTMLDivElement>(null),

    locations: React.useRef<HTMLDivElement>(null),
    commissions: React.useRef<HTMLDivElement>(null),
    settings: React.useRef<HTMLDivElement>(null),
  };

  // This function handles section changes with controlled scrolling
  const handleSectionChange = (sectionId: string) => {
    // First update the active section state
    setActiveSection(sectionId);

    // Then ensure the scroll position is reset
    if (contentRef.current) {
      // Force immediate scroll to top
      window.requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      });
    }
  };
  return (
    <Form {...form}>
      <form
        id="staff-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="h-full flex flex-col"
      >
        <div className={`flex flex-1 overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
          {isMobile ? (
            <div className="border-b border-gray-200 mb-4 overflow-x-auto">
              <div className="flex py-2 px-4 space-x-4">
                {['profile', 'services', 'locations', 'commissions'].map((section) => (
                  <button
                    key={section}
                    className={`px-3 py-2 text-sm whitespace-nowrap transition-colors rounded ${
                      activeSection === section
                        ? "bg-gray-100 text-gray-800 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    } ${sectionsWithErrors.includes(section) && !isMobile ? "border-red-500 border" : ""}`}
                    onClick={() => handleSectionChange(section)}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                    {sectionsWithErrors.includes(section) && 
                      <span className="ml-1 text-red-500">•</span>
                    }
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <StaffSideNav
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              sectionsWithErrors={sectionsWithErrors}              errorCounts={errorCounts}
            />
          )}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto h-full"
            style={{ overflowAnchor: "none" }} /* Prevent browser auto-scrolling */
          >
            {renderActiveSection()}
          </div>
        </div>
      </form>
    </Form>
  );
}

// Helper function to check if the selected employment type has perform_services permission
function hasPerformServicesPermission(employmentTypeId: string, types: any[]): boolean {
  if (!employmentTypeId || !types || types.length === 0) return false;
  const employmentType = types.find(type => type.id === employmentTypeId);
  return employmentType?.permissions?.includes("perform_services") || false;
}
