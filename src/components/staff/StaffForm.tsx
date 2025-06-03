import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ServiceMultiSelect } from "@/components/packages/ServiceMultiSelect";
import { ImageUploadSection } from "@/components/packages/form/ImageUploadSection";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CountryCodeDropdown } from "@/components/ui/country-code-dropdown";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { countryCodes, parsePhoneNumber } from "@/lib/country-codes";

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
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  locations: z.array(z.string()).min(1, "At least one location is required"),
});

type StaffFormData = z.infer<typeof formSchema>;

interface StaffFormProps {
  initialData?: any;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
  employeeId?: string;
  isSubmitting?: boolean;
  use2FactorVerification?: boolean; // New prop to enable 2Factor verification
}

export function StaffForm({
  initialData,
  onSubmit,
  onCancel,
  employeeId,
  isSubmitting = false,
  use2FactorVerification = false, // Default to false for backwards compatibility
}: StaffFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isPhoneCheckLoading, setIsPhoneCheckLoading] = useState(false);
  const [highlightMandatoryFields, setHighlightMandatoryFields] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<{
    name: string;
    code: string;
    flag: string;
  }>({
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
          .from('employment_types' as any)
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
      const phoneWithPlus = initialData.phone?.startsWith('+') ? initialData.phone : '+' + initialData.phone;
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
    form.setValue("locations", selectedLocations);
  }, [selectedLocations, form]);

  useEffect(() => {
    form.setValue("skills", selectedSkills);
  }, [selectedSkills, form]);

  const checkPhoneExists = async (phone: string) => {
    if (!phone || phone.length < 10) return false;

    // Skip check if we're editing and the phone hasn't changed
    if (initialData && employeeId) {
      // Get the original phone without the country code
      const phoneWithPlus = initialData.phone?.startsWith('+') ? initialData.phone : '+' + initialData.phone;
      const { phoneNumber: originalPhoneNumber } = parsePhoneNumber(phoneWithPlus);
      
      // If we're just updating other fields and the phone number hasn't changed
      if (phone === originalPhoneNumber) {
        return false; // Skip the existence check - this is the same phone number
      }
    }

    // Remove + from country code when checking
    const formattedPhone = `${selectedCountry.code.replace('+', '')}${phone}`;

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
        ? employeeData.some(e => e.id !== employeeId) 
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
  const handleFormSubmit = async (data: StaffFormData) => {
    // Turn off highlighting while performing validation
    setHighlightMandatoryFields(false);
    
    const phoneExists = await checkPhoneExists(data.phone);
    if (phoneExists) {
      return;
    }

    const updatedData = {
      ...data,
      photo_url: images[0] || null,
      // Remove + from country code when submitting
      phone: `${selectedCountry.code.replace('+', '')}${data.phone}`,
    };    if (use2FactorVerification) {
      // For "Next: Verify Phone" button, check if form is valid
      // If valid, submit the form, otherwise highlight mandatory fields
      const isFormValid = form.formState.isValid;
      if (!isFormValid) {
        setHighlightMandatoryFields(true);
        
        // Show toast message for required fields
        toast.error("Please fill in all required fields");
        
        // Find and scroll to the first error
        setTimeout(() => {
          const firstErrorElement = document.querySelector('.mandatory-field-error');
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        return;
      }
    }

    onSubmit(updatedData);
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocations((prev) => {
      if (prev.includes(locationId)) {
        return prev.filter((id) => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    form.setValue("phone", value);
  };
  // Add CSS for highlighting mandatory fields
  useEffect(() => {
    const styleId = 'staff-form-mandatory-styles';
    
    // Only add the styles if they don't already exist
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.innerHTML = `
        .mandatory-field-highlight input,
        .mandatory-field-highlight select,
        .mandatory-field-highlight .border {
          border-color: #ef4444 !important; /* red-500 */
          box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.3);
        }
        .mandatory-field-highlight .form-label::after {
          content: ' *';
          color: #ef4444;
          font-weight: bold;
        }
        .mandatory-field-error {
          color: #ef4444;
          font-size: 14px;
          margin-top: 4px;
          display: block;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    // Clean up on unmount
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  // Function to handle focus/input that resets highlighting when user starts fixing fields
  const handleInputFocus = () => {
    if (highlightMandatoryFields) {
      setHighlightMandatoryFields(false);
    }
  };

  // Add event listener for all form inputs
  useEffect(() => {
    if (highlightMandatoryFields) {
      const formInputs = document.querySelectorAll('input, select, [role="combobox"]');
      formInputs.forEach(input => {
        input.addEventListener('focus', handleInputFocus);
        input.addEventListener('input', handleInputFocus);
      });
      
      return () => {
        formInputs.forEach(input => {
          input.removeEventListener('focus', handleInputFocus);
          input.removeEventListener('input', handleInputFocus);
        });
      };
    }
  }, [highlightMandatoryFields]);

  return (
    <Form {...form}>
      {highlightMandatoryFields && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex items-center text-red-600 text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Please complete all required fields highlighted in red
          </div>
        </div>
      )}
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4"
      ><FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className={highlightMandatoryFields && (!field.value || field.value.length === 0) ? 'mandatory-field-highlight' : ''}>
              <FormLabel className="form-label">Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
              {highlightMandatoryFields && (!field.value || field.value.length === 0) && 
                <span className="mandatory-field-error">Name is required</span>
              }
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className={highlightMandatoryFields && (!field.value || field.value.length < 10) ? 'mandatory-field-highlight' : ''}>
              <FormLabel className="form-label">Phone</FormLabel>
              <FormControl>
                <div className="flex">
                  <CountryCodeDropdown
                    value={selectedCountry}
                    onChange={setSelectedCountry}
                    className="w-[120px]"
                  />
                  <Input
                    className="flex-1"
                    {...field}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    placeholder="Phone Number"
                  />
                </div>
              </FormControl>
              <FormMessage />
              {highlightMandatoryFields && (!field.value || field.value.length < 10) && 
                <span className="mandatory-field-error">Phone number with minimum 10 digits is required</span>
              }
            </FormItem>
          )}
        />

        <ImageUploadSection images={images} setImages={setImages} />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />        <FormField
          control={form.control}
          name="employment_type_id"
          render={({ field }) => (
            <FormItem className={highlightMandatoryFields && (!field.value || field.value.length === 0) ? 'mandatory-field-highlight' : ''}>
              <FormLabel className="form-label">Employment Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                defaultValue={initialData?.employment_type_id}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employmentTypes?.length ? (
                    employmentTypes.map((type: any) => (
                      <SelectItem 
                        key={type.id} 
                        value={type.id || 'invalid-id'} // Ensure value is never empty
                      >
                        {type.name || 'Unknown'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-employment-types" disabled>
                      No employment types available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
              {highlightMandatoryFields && (!field.value || field.value.length === 0) && 
                <span className="mandatory-field-error">Employment type is required</span>
              }
            </FormItem>
          )}
        />        <FormField
          control={form.control}
          name="locations"
          render={({ field }) => (
            <FormItem className={highlightMandatoryFields && (!selectedLocations || selectedLocations.length === 0) ? 'mandatory-field-highlight' : ''}>
              <FormLabel className="form-label">Locations</FormLabel>
              <FormControl>
                <div className={`border border-input rounded-md p-4 space-y-2 ${highlightMandatoryFields && selectedLocations.length === 0 ? 'border-red-500' : ''}`}>
                  {locations?.length ? (
                    locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`location-${location.id}`}
                          checked={selectedLocations.includes(location.id)}
                          onCheckedChange={() =>
                            handleLocationChange(location.id)
                          }
                        />
                        <Label
                          htmlFor={`location-${location.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {location.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No locations available
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
              {highlightMandatoryFields && selectedLocations.length === 0 && 
                <span className="mandatory-field-error">At least one location is required</span>
              }
            </FormItem>
          )}
        />        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem className={highlightMandatoryFields && (!field.value || field.value.length === 0) ? 'mandatory-field-highlight' : ''}>
              <FormLabel className="form-label">Skills</FormLabel>
              <FormControl>
                <div className={highlightMandatoryFields && (!field.value || field.value.length === 0) ? 'border border-red-500 rounded-md p-1' : ''}>
                  <ServiceMultiSelect
                    selectedServices={field.value}
                    onServiceSelect={(serviceId) => {
                      // Special handling for "all" services
                      if (serviceId === 'all') {
                        console.log("ALL SERVICES selected");
                        // Get all services from the database and select them
                        supabase
                          .from('services')
                          .select('id')
                          .then(({ data, error }) => {
                            if (!error && data) {
                              console.log("Got services data:", data.length, "services");
                              const allServiceIds = data.map(s => s.id);
                              setSelectedSkills(allServiceIds);
                              form.setValue("skills", allServiceIds);
                            } else {
                              console.error("Error fetching services:", error);
                            }
                          });
                      } else {
                        console.log("Single service selected:", serviceId);
                        // Normal single service selection
                        setSelectedSkills([...field.value, serviceId]);
                      }
                    }}
                    onServiceRemove={(serviceId) => {
                      setSelectedSkills(
                        field.value.filter((id) => id !== serviceId)
                      );
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
              {highlightMandatoryFields && (!field.value || field.value.length === 0) && 
                <span className="mandatory-field-error">At least one skill is required</span>
              }
            </FormItem>
          )}
        />        <div className="flex flex-col justify-end gap-2">
          {highlightMandatoryFields && (
            <div className="flex items-center justify-end mb-2 text-red-500 text-sm">
              <span>Please complete all required fields</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Close
            </Button>
            <Button 
              type="submit" 
              disabled={isPhoneCheckLoading || isSubmitting}
              className={highlightMandatoryFields ? "border-red-500 shadow-sm shadow-red-200" : ""}
            >
              {(isPhoneCheckLoading || isSubmitting) ? (
                <LoaderCircle
                  className="animate-spin mr-2"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : null}
              {employeeId ? "Update Staff Member" : 
               "Create Staff Member"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
