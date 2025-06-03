import React, { useState, useEffect } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CountryCodeDropdown } from "@/components/ui/country-code-dropdown";
import { UseFormReturn } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ProfileSectionProps {
  form: UseFormReturn<any>;
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCountry: { name: string; code: string; flag: string };
  setSelectedCountry: React.Dispatch<
    React.SetStateAction<{ name: string; code: string; flag: string }>
  >;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  employmentTypes?: any[];
  clearSectionError?: (sectionId: string) => void;
  isMobile?: boolean;
}

export function ProfileSection({
  form,
  images,
  setImages,
  selectedCountry,
  setSelectedCountry,
  handlePhoneChange,
  employmentTypes = [],
  clearSectionError,
  isMobile = false,
}: ProfileSectionProps) {
  const [showServicesAlert, setShowServicesAlert] = useState(false);

  // Check if the selected employment type has the perform_services permission
  const checkPerformServices = (employmentTypeId: string) => {
    if (!employmentTypeId || !employmentTypes) return false;

    const selectedType = employmentTypes.find(
      (type: any) => type.id === employmentTypeId
    );
    return selectedType?.permissions?.includes("perform_services") || false;
  };

  // Update alert visibility when employment type changes
  useEffect(() => {
    const employmentTypeId = form.getValues("employment_type_id");
    setShowServicesAlert(checkPerformServices(employmentTypeId));
  }, [form.watch("employment_type_id"), employmentTypes]);  return (
    <div className={`p-6 h-full ${isMobile ? 'pb-20' : ''}`}>
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-1">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your Staff members personal profile
        </p>
      </div>

      {/* Show alert when employment type with perform_services is selected */}

      <div className="mb-8">
        <div className="flex justify-center mb-4">
          <div className="relative w-[120px] h-[120px] group">
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center">
                <svg
                  className="text-gray-500 w-12 h-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
            <label
              htmlFor="profileImageUpload"
              className="absolute right-1 bottom-1 bg-white w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 cursor-pointer shadow-sm"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </label>
            <input
              id="profileImageUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;

                const file = files[0];
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const fileExt = file.name.split(".").pop();
                    const filePath = `profiles/${crypto.randomUUID()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                      .from("services")
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const {
                      data: { publicUrl },
                    } = supabase.storage
                      .from("services")
                      .getPublicUrl(filePath);

                    setImages([publicUrl]);
                    form.setValue("photo_url", publicUrl);
                    toast.success("Profile image uploaded");
                  } catch (error) {
                    toast.error("Error uploading profile image");
                    console.error("Upload error:", error);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number *</FormLabel>
                <FormControl>
                  <div className="flex">
                    <CountryCodeDropdown
                      value={selectedCountry}
                      onChange={setSelectedCountry}
                      className="w-[120px]"
                    />
                    <Input
                      className="flex-1 ml-2"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div> 
          <FormField
            control={form.control}
            name="employment_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Clear profile section error when a value is selected
                    if (clearSectionError && value) {
                      clearSectionError("profile");
                    }
                    // Update alert visibility based on the selected employment type
                    setShowServicesAlert(checkPerformServices(value));
                  }}
                  value={field.value}
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
                          value={type.id || "invalid-id"}
                        >
                          {type.name || "Unknown"}
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
              </FormItem>
            )}
          />
          {showServicesAlert && (
            <Alert className="mb-6 mt-2 border border-amber-500 bg-amber-50 shadow-sm">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <AlertTitle className="text-md font-bold text-amber-800">
                  Services Required
                </AlertTitle>
                <AlertDescription className="text-amber-700 text-sm mt-1">
                  The selected employment type includes the "perform services"
                  permission. This employee will be available for booking in the
                  calendar. Select at least one service.
                </AlertDescription>
              </div>
            </Alert>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
