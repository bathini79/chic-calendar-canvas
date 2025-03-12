
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TimeInput } from "@/components/ui/time-input";

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  onSuccess?: () => void;
  mode?: "full" | "contact" | "receipt" | "billing" | "location";
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

interface LocationHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  id?: string;
  location_id?: string;
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
  const [currentStep, setCurrentStep] = useState(1);
  const [locationHours, setLocationHours] = useState<LocationHours[]>([]);

  // Initialize location hours with default values for all days of the week
  const initializeLocationHours = () => {
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday = 0, Monday = 1, ..., Saturday = 6
    
    // If we already have hours with values, use them
    if (locationHours.length > 0) return;
    
    // Create default hours for each day
    const defaultHours: LocationHours[] = daysOfWeek.map(day => ({
      day_of_week: day,
      start_time: day === 0 ? '10:00' : '09:00', // Sunday starts later
      end_time: day === 0 ? '16:00' : '18:00',   // Sunday ends earlier
      is_closed: day === 0, // Sunday is closed by default
    }));
    
    setLocationHours(defaultHours);
  };

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

            // Fetch location hours
            const { data: hoursData, error: hoursError } = await supabase
              .from("location_hours")
              .select("*")
              .eq("location_id", locationId);
                
            if (hoursError) {
              console.error("Error fetching location hours:", hoursError);
            } else if (hoursData && hoursData.length > 0) {
              setLocationHours(hoursData);
            } else {
              initializeLocationHours();
            }
          }
        } catch (error) {
          console.error("Error fetching location:", error);
        } finally {
          setIsFetching(false);
        }
      };
      
      fetchLocationData();
    } else if (isOpen) {
      // Initialize hours for new location
      initializeLocationHours();
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
      setCurrentStep(1);
    }
  }, [isOpen, locationId]);

  const handleChange = (field: keyof LocationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update a specific day's hours
  const updateDayHours = (dayIndex: number, field: keyof LocationHours, value: any) => {
    setLocationHours(prev => 
      prev.map((day, index) => 
        index === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      return formData.name && (formData.email || formData.phone);
    } else if (currentStep === 2) {
      return formData.address;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      let locationId;
      
      if (mode === "contact") {
        // Handle contact edit mode
        const { error } = await supabase
          .from("locations")
          .update({
            email: formData.email,
            phone: formData.phone
          })
          .eq("id", locationId);

        if (error) throw error;
      } else if (mode === "billing" || mode === "location") {
        // Handle billing or location edit mode
        const updateData: Partial<LocationFormData> = {};
        
        if (mode === "billing") {
          updateData.name = formData.name;
        }
        
        if (mode === "location") {
          updateData.address = formData.address;
          updateData.city = formData.city;
          updateData.state = formData.state;
          updateData.zip_code = formData.zip_code;
          updateData.country = formData.country;
        }
        
        const { error } = await supabase
          .from("locations")
          .update(updateData)
          .eq("id", locationId);

        if (error) throw error;
      } else {
        // Handle full form submission
        if (!formData.name) {
          toast.error("Location name is required");
          setIsLoading(false);
          return;
        }

        let response;
        if (locationId) {
          // Update existing location
          response = await supabase
            .from("locations")
            .update(formData)
            .eq("id", locationId);
          
          if (response.error) throw response.error;
          locationId = locationId;
        } else {
          // Create new location
          response = await supabase
            .from("locations")
            .insert([formData])
            .select();

          if (response.error) throw response.error;
          if (response.data && response.data.length > 0) {
            locationId = response.data[0].id;
          }
        }

        // Save location hours
        if (locationId) {
          // First, delete any existing hours
          const { error: deleteError } = await supabase
            .from("location_hours")
            .delete()
            .eq("location_id", locationId);

          if (deleteError) throw deleteError;

          // Then insert the new hours
          const hoursToInsert = locationHours.map(hour => ({
            ...hour,
            location_id: locationId
          }));

          const { error: insertError } = await supabase
            .from("location_hours")
            .insert(hoursToInsert);

          if (insertError) throw insertError;
        }

        toast.success(locationId ? "Location updated successfully" : "Location created successfully");
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
    if (mode === "billing") return "Edit Billing Details";
    if (mode === "location") return "Edit Location";
    return locationId ? "Edit Location" : "Add Location";
  };

  const renderStepContent = () => {
    if (isFetching) {
      return <div className="py-4 text-center">Loading location data...</div>;
    }

    if (mode === "contact") {
      return (
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
      );
    }

    if (mode === "billing") {
      return (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Company name"
            />
          </div>
        </div>
      );
    }

    if (mode === "location") {
      return (
        <div className="space-y-4 py-4">
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
      );
    }

    if (mode === "full") {
      // Multi-step form
      switch (currentStep) {
        case 1: // Contact Information
          return (
            <div className="space-y-4 py-4">
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
          );
        
        case 2: // Address Information
          return (
            <div className="space-y-4 py-4">
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
          );
        
        case 3: // Opening Hours
          return (
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Set operating hours for this location. These will be the default working hours for your team and visible to clients.
              </p>
              
              {locationHours.map((day, index) => {
                const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                return (
                  <div key={index} className="grid grid-cols-1 gap-4 p-4 border rounded-md">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">{daysOfWeek[day.day_of_week]}</Label>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`closed-${index}`} className="text-sm">Closed</Label>
                        <Checkbox 
                          id={`closed-${index}`}
                          checked={day.is_closed}
                          onCheckedChange={(checked) => updateDayHours(index, 'is_closed', !!checked)}
                        />
                      </div>
                    </div>
                    
                    {!day.is_closed && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`start-time-${index}`}>Open</Label>
                          <Input
                            id={`start-time-${index}`}
                            type="time"
                            value={day.start_time}
                            onChange={(e) => updateDayHours(index, 'start_time', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`end-time-${index}`}>Close</Label>
                          <Input
                            id={`end-time-${index}`}
                            type="time"
                            value={day.end_time}
                            onChange={(e) => updateDayHours(index, 'end_time', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        
        default:
          return null;
      }
    }

    return null;
  };

  const totalSteps = 3;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={mode === "full" ? "w-full max-w-4xl h-[90vh] overflow-auto" : "sm:max-w-[500px]"}>
        <DialogHeader className="flex flex-row items-center">
          {mode === "full" && currentStep > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(prev => prev - 1)} className="mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        {renderStepContent()}

        <DialogFooter>
          {mode === "full" && (
            <div className="w-full flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div 
                    key={i}
                    className={`h-2 w-8 rounded-full ${currentStep === i + 1 ? 'bg-primary' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            
            {mode === "full" && currentStep < totalSteps ? (
              <Button 
                onClick={() => setCurrentStep(prev => prev + 1)} 
                disabled={!validateCurrentStep() || isLoading}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading || isFetching}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
