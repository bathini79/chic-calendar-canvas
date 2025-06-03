import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MapPin, Building2, AtSign, Phone, Clock, Calendar, Check, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  onSuccess?: () => void;
  mode?: "full" | "contact" | "receipt" | "billing" | "location" | "hours";
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

interface ValidationErrors {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
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
  const [activeTab, setActiveTab] = useState("general");
  const [locationHours, setLocationHours] = useState<LocationHours[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const isMobile = useIsMobile();

  const initializeLocationHours = () => {
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    if (locationHours.length > 0) return;
    const defaultHours: LocationHours[] = daysOfWeek.map(day => ({
      day_of_week: day,
      start_time: day === 0 ? '10:00' : '09:00',
      end_time: day === 0 ? '16:00' : '18:00',
      is_closed: day === 0,
    }));
    setLocationHours(defaultHours);
  };

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
      initializeLocationHours();
    }
  }, [locationId, isOpen]);

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
      setActiveTab("general");
      setErrors({});
      setTouched({});
      setCurrentStep(1);
    }
  }, [isOpen, locationId]);

  const handleChange = (field: keyof LocationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    validateField(field, value);
  };

  const validateField = (field: string, value: any) => {
    let newErrors = { ...errors };
    switch(field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = "Location name is required";
        } else {
          delete newErrors.name;
        }
        break;
      case 'address':
        if (!value.trim() && activeTab !== "general") {
          newErrors.address = "Address is required";
        } else {
          delete newErrors.address;
        }
        break;
      case 'email':
        if (value && !/^\S+@\S+\.\S+$/.test(value)) {
          newErrors.email = "Invalid email format";
        } else {
          delete newErrors.email;
        }
        break;
      case 'phone':
        if (value && !/^[0-9+\-\s()]*$/.test(value)) {
          newErrors.phone = "Invalid phone number";
        } else {
          delete newErrors.phone;
        }
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors: ValidationErrors = {};
    let isValid = true;
    if (!formData.name.trim()) {
      newErrors.name = "Location name is required";
      isValid = false;
    }
    if (activeTab !== "general" && !formData.address.trim()) {
      newErrors.address = "Address is required";
      isValid = false;
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
      isValid = false;
    }
    if (formData.phone && !/^[0-9+\-\s()]*$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number";
      isValid = false;
    }
    setErrors(newErrors);
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    return isValid;
  };

  const updateDayHours = (dayIndex: number, field: keyof LocationHours, value: any) => {
    setLocationHours(prev => 
      prev.map((day, index) => 
        index === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1) {
        // Validate name field before proceeding
        if (!formData.name.trim()) {
          setErrors(prev => ({ ...prev, name: "Location name is required" }));
          setTouched(prev => ({ ...prev, name: true }));
          return;
        }
      }
      
      if (currentStep === 2) {
        // Validate address field before proceeding
        if (!formData.address.trim()) {
          setErrors(prev => ({ ...prev, address: "Address is required" }));
          setTouched(prev => ({ ...prev, address: true }));
          return;
        }
      }
      
      setCurrentStep(prev => prev + 1);
      if (currentStep === 1) setActiveTab("address");
      if (currentStep === 2) setActiveTab("hours");
      
      // Scroll to top when changing steps
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      if (currentStep === 2) setActiveTab("general");
      if (currentStep === 3) setActiveTab("address");
      
      // Scroll to top when changing steps
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }
    setIsLoading(true);
    try {
      let updatedLocationId = locationId;
      if (mode === "contact") {
        if (!updatedLocationId) {
          throw new Error("Location ID is required for editing contact details");
        }
        const { error } = await supabase
          .from("locations")
          .update({
            email: formData.email,
            phone: formData.phone
          })
          .eq("id", updatedLocationId);
        if (error) throw error;
      } else if (mode === "billing" || mode === "location") {
        if (!updatedLocationId) {
          throw new Error(`Location ID is required for editing ${mode} details`);
        }
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
          .eq("id", updatedLocationId);
        if (error) throw error;
      } else {
        if (!formData.name) {
          toast.error("Location name is required");
          setIsLoading(false);
          return;
        }
        let response;
        if (updatedLocationId) {
          response = await supabase
            .from("locations")
            .update(formData)
            .eq("id", updatedLocationId);
          if (response.error) throw response.error;
        } else {
          response = await supabase
            .from("locations")
            .insert([formData])
            .select();
          if (response.error) throw response.error;
          if (response.data && response.data.length > 0) {
            updatedLocationId = response.data[0].id;
          } else {
            throw new Error("Failed to get ID of newly created location");
          }
        }
        if (updatedLocationId) {
          const { error: deleteError } = await supabase
            .from("location_hours")
            .delete()
            .eq("location_id", updatedLocationId);
          if (deleteError) throw deleteError;
          const hoursToInsert = locationHours.map(hour => ({
            ...hour,
            location_id: updatedLocationId
          }));
          const { error: insertError } = await supabase
            .from("location_hours")
            .insert(hoursToInsert);
          if (insertError) throw insertError;
        }
        toast.success(updatedLocationId === locationId ? "Location updated successfully" : "Location created successfully");
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
    if (mode === "hours") return "Edit Opening Hours";
    return locationId ? "Edit Location" : "Add Location";
  };

  const renderContactSection = () => {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <Label htmlFor="name" className="text-base font-medium flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              Location Name <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Main Salon"
              className={cn("h-12 text-base", errors.name && touched.name ? "border-destructive" : "")}
            />
            {errors.name && touched.name && (
              <div className="text-sm text-destructive flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" /> {errors.name}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="is_active" className="text-base font-medium flex items-center">
              Status
            </Label>
            <div className="flex items-center gap-3 h-12">
              <div 
                className={cn(
                  "px-4 py-2 rounded-md border flex items-center gap-2 cursor-pointer flex-1 justify-center transition-all",
                  formData.is_active ? "bg-primary/10 border-primary text-primary font-medium" : "bg-muted/10"
                )}
                onClick={() => handleChange("is_active", true)}
              >
                {formData.is_active && <Check className="h-4 w-4 text-primary" />}
                Active
              </div>
              <div 
                className={cn(
                  "px-4 py-2 rounded-md border flex items-center gap-2 cursor-pointer flex-1 justify-center transition-all",
                  !formData.is_active ? "bg-muted/30 border-muted-foreground font-medium" : "bg-muted/10"
                )}
                onClick={() => handleChange("is_active", false)}
              >
                {!formData.is_active && <Check className="h-4 w-4" />}
                Inactive
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-base font-medium flex items-center">
              <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Location email address"
              className={cn("h-12 text-base", errors.email && touched.email ? "border-destructive" : "")}
            />
            {errors.email && touched.email && (
              <div className="text-sm text-destructive flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" /> {errors.email}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="phone" className="text-base font-medium flex items-center">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="Contact number"
              className={cn("h-12 text-base", errors.phone && touched.phone ? "border-destructive" : "")}
            />
            {errors.phone && touched.phone && (
              <div className="text-sm text-destructive flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" /> {errors.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAddressSection = () => {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <div className="space-y-2.5">
          <Label htmlFor="address" className="text-base font-medium flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            Address <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Street address"
            className={cn("h-12 text-base", errors.address && touched.address ? "border-destructive" : "")}
          />
          {errors.address && touched.address && (
            <div className="text-sm text-destructive flex items-center mt-1">
              <AlertCircle className="h-3 w-3 mr-1" /> {errors.address}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <Label htmlFor="city" className="text-base font-medium">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="City"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="state" className="text-base font-medium">State/Province</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="State/Province"
              className="h-12 text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <Label htmlFor="zip_code" className="text-base font-medium">Postal Code</Label>
            <Input
              id="zip_code"
              value={formData.zip_code}
              onChange={(e) => handleChange("zip_code", e.target.value)}
              placeholder="Postal/Zip code"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="country" className="text-base font-medium">Country</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => handleChange("country", value)}
            >
              <SelectTrigger className="h-12 text-base">
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
  };

  const renderHoursSection = () => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <div className="space-y-3">
          {locationHours.map((day, index) => {
            return (
              <Card 
                key={index} 
                className={cn(
                  "overflow-hidden transition-all border",
                  day.is_closed ? "bg-muted/10" : "hover:border-muted-foreground/30"
                )}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4">
                    <div className="flex items-center gap-2 mb-2 sm:mb-0 sm:flex-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-base font-medium">{daysOfWeek[day.day_of_week]}</span>
                    </div>
                    
                    <div 
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors w-fit",
                        day.is_closed ? "bg-muted/20 text-muted-foreground" : "bg-green-500/10 text-green-600"
                      )}
                      onClick={() => updateDayHours(index, 'is_closed', !day.is_closed)}
                    >
                      <div 
                        className={cn(
                          "w-3.5 h-3.5 rounded-full",
                          day.is_closed ? "bg-muted-foreground" : "bg-green-500"
                        )}
                      />
                      {day.is_closed ? "Closed" : "Open"}
                    </div>
                  </div>
                  
                  {!day.is_closed && (
                    <div className="border-t p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`start-time-${index}`} className="text-sm font-medium">Open Time</Label>
                        <Input
                          id={`start-time-${index}`}
                          type="time"
                          value={day.start_time}
                          onChange={(e) => updateDayHours(index, 'start_time', e.target.value)}
                          className="h-10 text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`end-time-${index}`} className="text-sm font-medium">Close Time</Label>
                        <Input
                          id={`end-time-${index}`}
                          type="time"
                          value={day.end_time}
                          onChange={(e) => updateDayHours(index, 'end_time', e.target.value)}
                          className="h-10 text-base"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepIndicator = () => {
    return (
      <div className="p-4 border-b bg-muted/5">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center relative">
            {/* Progress connecting lines */}
            <div className="absolute top-4 left-[12%] right-[12%] h-0.5 bg-muted"></div>
            <div 
              className={cn(
                "absolute top-4 left-[12%] h-0.5 bg-primary transition-all",
                currentStep >= 2 ? "w-[38%]" : "w-0"
              )}
              style={{ transitionProperty: 'width', transitionDuration: '300ms' }}
            ></div>
            <div 
              className={cn(
                "absolute top-4 left-[50%] h-0.5 bg-primary transition-all",
                currentStep >= 3 ? "w-[38%]" : "w-0"
              )}
              style={{ transitionProperty: 'width', transitionDuration: '300ms' }}
            ></div>
            
            {/* Step circles */}
            {[
              { name: 'Details', icon: <Building2 className="h-3.5 w-3.5" /> },
              { name: 'Address', icon: <MapPin className="h-3.5 w-3.5" /> },
              { name: 'Hours', icon: <Clock className="h-3.5 w-3.5" /> }
            ].map((step, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex flex-col items-center text-center z-10 flex-1", 
                  idx + 1 <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-1 text-sm font-medium border transition-all", 
                  currentStep === idx + 1 ? "bg-primary text-primary-foreground border-primary" : 
                  idx + 1 < currentStep ? "bg-primary/20 text-primary border-primary" : 
                  "bg-background text-muted-foreground border-muted"
                )}>
                  {step.icon}
                </div>
                <span className="text-xs font-medium">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isFetching) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[98vw] max-w-3xl h-[95vh] overflow-auto p-0 mt-[5vh] rounded-t-2xl rounded-b-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading location data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const dialogMaxWidth = mode === "full" ? "max-w-4xl" : "max-w-xl";

  if (mode !== "full") {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={`w-[98vw] ${dialogMaxWidth} p-0 mt-[5vh] rounded-xl`}>
          <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-semibold">{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] overflow-y-auto" style={{msOverflowStyle: "auto", WebkitOverflowScrolling: "touch"}}>
            <div className="p-6">
              {mode === "contact" && renderContactSection()}
              {mode === "billing" && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-lg mb-2">Billing Details</h3>
                    <p className="text-muted-foreground text-sm">
                      Update billing information for this location.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <Label htmlFor="name" className="text-base font-medium flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        Company Name <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Company name"
                        className={cn("h-12 text-base", errors.name && touched.name ? "border-destructive" : "")}
                      />
                      {errors.name && touched.name && (
                        <div className="text-sm text-destructive flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" /> {errors.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {mode === "location" && renderAddressSection()}
              {mode === "hours" && renderHoursSection()}
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t flex flex-row justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="h-11">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="h-11 min-w-[100px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  Saving...
                </span>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="!top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[98vw] h-[95vh] max-w-none border p-6 shadow-xl rounded-t-2xl !rounded-b-none"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 md:p-6 border-b flex items-center justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full shrink-0"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-xl font-semibold">{getDialogTitle()}</DialogTitle>
            </div>
            
            
          </div>
          
          {renderStepIndicator()}
          
          <ScrollArea className="flex-1 overflow-y-auto" style={{msOverflowStyle: "auto", WebkitOverflowScrolling: "touch"}}>
            <div className="py-6 max-w-3xl mx-auto w-full">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-5 rounded-lg mb-4 mx-4 sm:mx-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Location Details
                    </h3>
                    <p className="text-muted-foreground">
                      Enter general information about this location including name, email, and contact details.
                    </p>
                  </div>
                  {renderContactSection()}
                </div>
              )}
              
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-5 rounded-lg mb-4 mx-4 sm:mx-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Location Address
                    </h3>
                    <p className="text-muted-foreground">
                      Enter the physical address details of this location. This information will be visible to your clients.
                    </p>
                  </div>
                  {renderAddressSection()}
                </div>
              )}
              
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-5 rounded-lg mb-4 mx-4 sm:mx-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Business Hours
                    </h3>
                    <p className="text-muted-foreground">
                      Set the operating hours for this location. These will appear on your booking portal and help clients know when you're open.
                    </p>
                  </div>
                  {renderHoursSection()}
                </div>
              )}
              
              {Object.keys(errors).length > 0 && (
                <div className="mt-8 bg-destructive/10 border border-destructive/20 p-4 rounded-lg mx-4 sm:mx-6">
                  <h3 className="text-destructive flex items-center text-sm font-medium mb-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Please fix the following errors:
                  </h3>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Add some padding at the bottom to prevent content from being hidden behind the footer */}
              <div className="h-28"></div>
            </div>
          </ScrollArea>
          
          <div className="border-t p-4 sm:p-6 bg-background sticky bottom-0 shadow-md">
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep} 
                  disabled={currentStep === 1 || isLoading}
                  className="h-11 px-4 sm:px-6 min-w-[100px] flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                {!isMobile && (
                  <div className="text-sm font-medium bg-muted/20 px-3 py-1.5 rounded-full">
                    Step {currentStep} of {totalSteps}
                  </div>
                )}
                
                {currentStep < totalSteps ? (
                  <Button 
                    onClick={handleNextStep}
                    className="h-11 px-4 sm:px-6 min-w-[100px] flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isLoading || Object.keys(errors).length > 0}
                    className="h-11 px-4 sm:px-6 min-w-[100px]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                        Saving...
                      </span>
                    ) : "Save Location"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
