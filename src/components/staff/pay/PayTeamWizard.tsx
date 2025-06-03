import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronRight, LoaderCircle, Store, Users, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePayroll } from "@/hooks/use-payroll";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PayPeriod } from "@/types/payroll-db";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface PayTeamWizardProps {
  open: boolean;
  onClose: () => void;
  payPeriod: PayPeriod | null;
  onPayRunCreated: () => void;
}

type Step = "location" | "compensation" | "summary";

interface Location {
  id: string;
  name: string;
}

interface CompensationType {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

export function PayTeamWizard({
  open,
  onClose,
  payPeriod,
  onPayRunCreated
}: PayTeamWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState<Step>("location");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([
    { id: "salary", label: "Salary", description: "Regular salary payments", selected: true },
    { id: "commission", label: "Commissions", description: "Service and product commissions", selected: true },
    { id: "tips", label: "Tips", description: "Client tips", selected: true },
    { id: "other", label: "Other", description: "Other compensation adjustments", selected: false }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [teamMemberCount, setTeamMemberCount] = useState<number>(0);
  
  // Hooks
  const { createPayRun } = usePayroll();
  
  // Load locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name")
          .order("name");
        
        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error("Error loading locations:", error);
      }
    }
    
    fetchLocations();
  }, []);
  
  // Load employee count for the summary step
  useEffect(() => {
    async function fetchEmployeeCount() {
      if (currentStep !== "summary") return;
      
      try {
        let query = supabase.from("employees").select("id", { count: "exact" });
        
        // Filter by location if not "all"
        if (selectedLocation !== "all") {
          query = query.eq("location_id", selectedLocation);
        }
        
        const { count, error } = await query;
        
        if (error) throw error;
        setTeamMemberCount(count || 0);
      } catch (error) {
        console.error("Error fetching employee count:", error);
      }
    }
    
    fetchEmployeeCount();
  }, [currentStep, selectedLocation]);

  // Toggle compensation type selection
  const toggleCompensationType = (id: string) => {
    setCompensationTypes(types => 
      types.map(type => 
        type.id === id ? { ...type, selected: !type.selected } : type
      )
    );
  };
  
  // Go to next step
  const goToNextStep = () => {
    if (currentStep === "location") {
      setCurrentStep("compensation");
    } else if (currentStep === "compensation") {
      setCurrentStep("summary");
    }
  };
  
  // Go to previous step
  const goToPreviousStep = () => {
    if (currentStep === "compensation") {
      setCurrentStep("location");
    } else if (currentStep === "summary") {
      setCurrentStep("compensation");
    }
  };
  
  // Create pay run
  const handleCreatePayRun = async () => {
    if (!payPeriod) return;
    
    setIsLoading(true);
    try {
      const name = `Pay Run for ${format(new Date(payPeriod.start_date), 'MMM d')} - ${format(new Date(payPeriod.end_date), 'MMM d, yyyy')}`;
      const locationId = selectedLocation === "all" ? undefined : selectedLocation;
      
      await createPayRun.mutateAsync({
        payPeriodId: payPeriod.id,
        name,
        locationId
      });
      
      onPayRunCreated();
      onClose();
    } catch (error) {
      console.error("Error creating pay run:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine if we can proceed to the next step
  const canProceed = () => {
    if (currentStep === "location") {
      return true; // Can always proceed from location step
    } else if (currentStep === "compensation") {
      return compensationTypes.some(type => type.selected); // At least one type must be selected
    }
    return true;
  };

  // Render progress indicator
  const renderProgress = () => {
    return (
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep === "location" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-foreground"}`}>
            <Store className="h-4 w-4" />
          </div>
          <Separator className="w-12 mx-1" />
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep === "compensation" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-foreground"}`}>
            <CreditCard className="h-4 w-4" />
          </div>
          <Separator className="w-12 mx-1" />
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep === "summary" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-foreground"}`}>
            <Users className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  };

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case "location":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Select Location</h2>
            <p className="text-sm text-muted-foreground">
              Choose which location to create the pay run for. You can select 'All locations' to include team members from all locations.
            </p>
            
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger>
                <SelectValue placeholder="All locations">
                  {selectedLocation === "all" ? "All locations" : 
                    locations.find(l => l.id === selectedLocation)?.name || "All locations"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "compensation":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Select Compensation Types</h2>
            <p className="text-sm text-muted-foreground">
              Choose which compensation types to include in this pay run.
            </p>
            
            <div className="space-y-3">
              {compensationTypes.map(type => (
                <div 
                  key={type.id}
                  className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer"
                  onClick={() => toggleCompensationType(type.id)}
                >
                  <Checkbox 
                    id={`comp-${type.id}`}
                    checked={type.selected}
                    onCheckedChange={() => toggleCompensationType(type.id)}
                  />
                  <div className="flex-1">
                    <label 
                      htmlFor={`comp-${type.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {type.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                  {type.selected && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      case "summary":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Pay Run Summary</h2>
            <p className="text-sm text-muted-foreground">
              Review your pay run details before creating.
            </p>
            
            <div className="space-y-3 border rounded-md p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Pay Period:</div>
                <div className="text-sm">
                  {payPeriod ? (
                    <>
                      {format(new Date(payPeriod.start_date), 'MMM d')} - {format(new Date(payPeriod.end_date), 'MMM d, yyyy')}
                    </>
                  ) : "Not selected"}
                </div>
                
                <div className="text-sm font-medium">Location:</div>
                <div className="text-sm">
                  {selectedLocation === "all" ? "All locations" : locations.find(l => l.id === selectedLocation)?.name}
                </div>
                
                <div className="text-sm font-medium">Team Members:</div>
                <div className="text-sm">{teamMemberCount}</div>
                
                <div className="text-sm font-medium">Compensation Types:</div>
                <div className="text-sm">
                  {compensationTypes
                    .filter(type => type.selected)
                    .map(type => type.label)
                    .join(", ")}
                </div>
              </div>
            </div>
            
            <div className="text-sm">
              <p>A pay run will be created with the above settings. You'll then be able to review and adjust individual team members' payments before processing.</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Pay Run</DialogTitle>
        </DialogHeader>
        
        {renderProgress()}
        {renderStepContent()}
        
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === "location" ? onClose : goToPreviousStep}
          >
            {currentStep === "location" ? "Cancel" : "Back"}
          </Button>
          
          <Button
            type="button"
            onClick={currentStep === "summary" ? handleCreatePayRun : goToNextStep}
            disabled={!canProceed() || isLoading}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : currentStep === "summary" ? (
              "Create Pay Run"
            ) : (
              <>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
