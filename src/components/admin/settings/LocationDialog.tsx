
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  onSuccess?: () => void;
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

export function LocationDialog({ isOpen, onClose, locationId, onSuccess }: LocationDialogProps) {
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
      
      supabase
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .single()
        .then(({ data, error }) => {
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
        })
        .finally(() => {
          setIsFetching(false);
        });
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
    if (!formData.name || !formData.address) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      if (locationId) {
        // Update existing location
        const { error } = await supabase
          .from("locations")
          .update(formData)
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{locationId ? "Edit Location" : "Add Location"}</DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="py-4 text-center">Loading location data...</div>
        ) : (
          <div className="grid gap-4 py-4">
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Location is active</Label>
            </div>
          </div>
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
