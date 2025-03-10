
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  onSuccess?: () => void;
  mode?: "full" | "contact" | "receipt";
}

interface LocationFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  email: string;
  phone: string;
  is_active: boolean;
}

export function LocationDialog({ isOpen, onClose, locationId, onSuccess, mode = "full" }: LocationDialogProps) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "India",
    email: "",
    phone: "",
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch location data if editing
  useEffect(() => {
    if (locationId && isOpen) {
      setIsFetching(true);
      
      const fetchLocationData = async () => {
        try {
          const { data, error } = await supabase
            .from("locations")
            .select("*")
            .eq("id", locationId)
            .single();
            
          if (error) {
            toast.error("Failed to fetch location data");
            console.error(error);
          } else if (data) {
            setFormData({
              name: data.name || "",
              address: data.address || "",
              city: data.city || "",
              state: data.state || "",
              zip_code: data.zip_code || "",
              country: data.country || "India",
              email: data.email || "",
              phone: data.phone || "",
              is_active: data.is_active !== false,
            });
          }
        } catch (error) {
          console.error("Error fetching location:", error);
        } finally {
          setIsFetching(false);
        }
      };
      
      fetchLocationData();
    }
  }, [locationId, isOpen]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (!locationId) {
        setFormData({
          name: "",
          address: "",
          city: "",
          state: "",
          zip_code: "",
          country: "India",
          email: "",
          phone: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, locationId]);

  const handleChange = (field: keyof LocationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Validate based on the current mode
    if (mode === "full" && (!formData.name || !formData.address)) {
      toast.error("Please fill in all required fields");
      return;
    } else if (mode === "contact" && (!formData.email && !formData.phone)) {
      toast.error("Please fill in at least one contact method");
      return;
    }

    setIsLoading(true);

    try {
      let updatedData: Partial<LocationFormData> = {};
      
      // Only update the relevant fields based on mode
      if (mode === "full") {
        updatedData = formData;
      } else if (mode === "contact") {
        updatedData = {
          email: formData.email,
          phone: formData.phone
        };
      } else if (mode === "receipt") {
        // Receipt sequencing is handled separately in LocationDetails
        onClose();
        return;
      }
      
      if (locationId) {
        // Update existing location
        const { error } = await supabase
          .from("locations")
          .update(updatedData)
          .eq("id", locationId);

        if (error) throw error;
        toast.success("Location updated successfully");
      } else {
        // Create new location
        const { error } = await supabase
          .from("locations")
          .insert([formData]);

        if (error) throw error;
        toast.success("Location created successfully");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to ${locationId ? 'update' : 'create'} location: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogTitle = () => {
    if (mode === "contact") return "Edit Contact Details";
    if (mode === "receipt") return "Edit Receipt Settings";
    return locationId ? "Edit Location" : "Add Location";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={mode === "full" ? "w-full max-w-4xl h-[90vh] overflow-auto" : "sm:max-w-[500px]"}>
        <DialogHeader className="flex flex-row items-center">
          {mode === "full" && (
            <Button variant="ghost" size="sm" onClick={onClose} className="mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="py-4 text-center">Loading location data...</div>
        ) : (
          <>
            {mode === "full" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Location Name*</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="e.g. Main Salon"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address*</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Street address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="City"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleChange("state", e.target.value)}
                        placeholder="State/Province"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">Postal Code</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => handleChange("zip_code", e.target.value)}
                        placeholder="Postal/Zip code"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => handleChange("country", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="Location email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="Contact number"
                    />
                  </div>

                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange("is_active", checked)}
                    />
                    <Label htmlFor="is_active">Location is active</Label>
                  </div>
                </div>
              </div>
            )}

            {mode === "contact" && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Location email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Contact number"
                  />
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isFetching}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
