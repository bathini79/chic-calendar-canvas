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
}

export function StaffForm({
  initialData,
  onSubmit,
  onCancel,
  employeeId,
}: StaffFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isPhoneCheckLoading, setIsPhoneCheckLoading] = useState(false);
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
      const { data, error } = await supabase
        .from("employment_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone
          ? initialData.phone.replace(/^\+\d+\s/, "")
          : "",
        photo_url: initialData.photo_url || "",
        status: initialData.status || "active",
        employment_type_id: initialData.employment_type_id || "",
        skills:
          initialData.employee_skills?.map((s: any) => s.service_id) || [],
        locations:
          initialData.employee_locations?.map((l: any) => l.location_id) || [],
      });

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

    const formattedPhone = `${selectedCountry.code.slice(1)}${phone}`;

    try {
      setIsPhoneCheckLoading(true);

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("phone", formattedPhone);

      if (employeeError) throw employeeError;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone_number", formattedPhone);

      if (profileError) throw profileError;

      const employeeExists = employeeData.some((e) => e.id !== employeeId);
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
    const phoneExists = await checkPhoneExists(data.phone);
    if (phoneExists) {
      return;
    }

    const updatedData = {
      ...data,
      photo_url: images[0] || null,
      phone: `${selectedCountry.code.slice(1)}${data.phone}`,
    };

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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
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
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone *</FormLabel>
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
        />

        <FormField
          control={form.control}
          name="employment_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employment Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employmentTypes?.length ? (
                    employmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No employment types available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locations"
          render={() => (
            <FormItem>
              <FormLabel>Locations *</FormLabel>
              <FormControl>
                <div className="border border-input rounded-md p-4 space-y-2">
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills *</FormLabel>
              <FormControl>
                <ServiceMultiSelect
                  selectedServices={field.value}
                  onServiceSelect={(serviceId) => {
                    setSelectedSkills([...field.value, serviceId]);
                  }}
                  onServiceRemove={(serviceId) => {
                    setSelectedSkills(
                      field.value.filter((id) => id !== serviceId)
                    );
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPhoneCheckLoading}>
            {isPhoneCheckLoading ? (
              <LoaderCircle
                className="animate-spin mr-2"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : null}
            {employeeId ? "Update Staff Member" : "Create Staff Member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
