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
import { ImageUploadSection } from "@/components/packages/form/ImageUploadSection";
import { cn } from "@/lib/utils";

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
  }, [form.watch("employment_type_id"), employmentTypes]);

  return (
    <div className={cn(
      "space-y-6",
      isMobile ? "px-4 pb-20" : "pl-32 pr-8"
    )}>
      <div className={cn(
        "bg-white",
        isMobile ? "space-y-6" : "border rounded-lg p-6 max-w-[680px]"
      )}>
        <h3 className={cn(
          "font-semibold",
          isMobile ? "text-base" : "text-lg mb-4"
        )}>Profile Information</h3>
        
        <div className="space-y-6">
          <div className={cn(
            isMobile ? "space-y-6" : "grid gap-4 max-w-[620px]"
          )}>
            <div>
              <FormField
                control={form.control}
                name="photo_url"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className={cn(
                        "font-medium",
                        isMobile ? "text-sm" : "text-base"
                      )}>Profile Photo</FormLabel>
                      <FormControl>
                        <ImageUploadSection
                          images={images}
                          setImages={setImages}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className={cn(
                        "font-medium",
                        isMobile ? "text-sm" : "text-base"
                      )}>Full Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter full name" 
                          {...field}
                          className={cn(
                            isMobile ? "h-10 text-base" : "h-10"
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className={cn(
                        "font-medium",
                        isMobile ? "text-sm" : "text-base"
                      )}>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email" 
                          {...field}
                          className={cn(
                            isMobile ? "h-10 text-base" : "h-10"
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className={cn(
                        "font-medium",
                        isMobile ? "text-sm" : "text-base"
                      )}>Phone Number *</FormLabel>
                      <div className="flex gap-2">
                        <CountryCodeDropdown
                          value={selectedCountry}
                          onChange={setSelectedCountry}
                          className={cn(
                            isMobile ? "h-10" : ""
                          )}
                        />
                        <FormControl>
                          <Input
                            placeholder="Enter phone number"
                            {...field}
                            onChange={(e) => handlePhoneChange(e)}
                            className={cn(
                              isMobile ? "h-10 text-base flex-1" : "h-10"
                            )}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="employment_type_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className={cn(
                        "font-medium",
                        isMobile ? "text-sm" : "text-base"
                      )}>Employment Type *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          clearSectionError?.("employment_type_id");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={cn(
                            isMobile ? "h-10 text-base" : "h-10"
                          )}>
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employmentTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel className={cn(
                        "font-medium",
                        isMobile ? "text-sm" : "text-base"
                      )}>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={cn(
                            isMobile ? "h-10 text-base" : "h-10"
                          )}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {showServicesAlert && (
        <div className={cn(
          "border rounded-lg p-4 bg-yellow-50 border-yellow-200",
          isMobile ? "mx-4" : "max-w-[680px]"
        )}>
          <p className="text-sm text-yellow-800">
            This employment type can perform services. Please configure services in
            the Services tab.
          </p>
        </div>
      )}
    </div>
  );
}
