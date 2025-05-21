import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { PlusCircle, Trash2, Save, LoaderCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define the Service and Category interfaces
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  category_id?: string;
  category_name?: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  services: Service[];
}

// Define the Template interface
interface CommissionTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'flat' | 'tiered';
}

// Define the Slab interface
interface CommissionSlab {
  id?: string;
  min_amount: number;
  max_amount: number | null;
  percentage: number;
  template_id?: string;
}

// Define the Service Commission interface
interface ServiceCommission {
  id?: string;
  service_id: string;
  percentage: number;
  employee_id?: string;
}

interface CommissionsSectionProps {
  form: any;
  employeeId?: string;
  isMobile?: boolean;
}

export function CommissionsSection({
  form,
  employeeId,
  isMobile = false,
}: CommissionsSectionProps) {
  const [commissionType, setCommissionType] = useState<string>("flat");
  const [slabs, setSlabs] = useState<CommissionSlab[]>([
    { min_amount: 0, max_amount: 1000, percentage: 20 },
  ]);
  const [serviceCommissions, setServiceCommissions] = useState<ServiceCommission[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  
  // Fetch services with proper mapping to Service interface
  const { data: services = [], isLoading: isLoadingServices, error: servicesError } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select(`
            *,
            services_categories(
              categories (
                id,
                name
              )
            )
          `)
          .order("name"); // No filter to show all services

        if (error) {
          console.error("Error fetching services:", error);
          throw error;
        }
        
        // Map DB data to the Service interface 
        const processedServices = data?.map(service => {
          const category = service.services_categories?.[0]?.categories;
          return {
            id: service.id,
            name: service.name,
            price: service.selling_price || 0, // Map selling_price to price
            duration: service.duration || 0,
            description: service.description || '',
            category_id: category?.id || 'uncategorized',
            category_name: category?.name || 'Uncategorized',
          };
        }) || [];
        
        console.log("Services fetched successfully:", processedServices.length);
        return processedServices;
      } catch (error) {
        console.error("Error in services query function:", error);
        throw error;
      }
    },
  });
  
  // Fetch commission templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery<CommissionTemplate[]>({
    queryKey: ["commission_templates", commissionType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_templates")
        .select("*")
        .eq("type", commissionType)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employee commissions if employee ID is provided
  useEffect(() => {
    if (employeeId) {
      const fetchEmployeeCommissions = async () => {
        try {
          // Get the employee commission settings
          const { data: employeeCommission, error: empError } = await supabase
            .from("employee_commissions")
            .select("*")
            .eq("employee_id", employeeId)
            .single();

          if (empError && empError.code !== "PGRST116") {
            console.error("Error fetching employee commission:", empError);
            return;
          }

          if (employeeCommission) {
            setCommissionType(employeeCommission.commission_type);
            setSelectedTemplateId(employeeCommission.template_id || null);

            // If template ID exists, fetch the slabs
            if (employeeCommission.template_id && employeeCommission.commission_type === "tiered") {
              const { data: slabsData, error: slabsError } = await supabase
                .from("commission_slabs")
                .select("*")
                .eq("template_id", employeeCommission.template_id)
                .order("min_amount", { ascending: true });

              if (slabsError) {
                console.error("Error fetching commission slabs:", slabsError);
              } else if (slabsData && slabsData.length > 0) {
                setSlabs(slabsData);
              }
            }

            // If commission type is flat, fetch service-specific commissions
            if (employeeCommission.commission_type === "flat") {
              const { data: serviceCommData, error: serviceCommError } = await supabase
                .from("service_commissions")
                .select("*")
                .eq("employee_id", employeeId);

              if (serviceCommError) {
                console.error("Error fetching service commissions:", serviceCommError);
              } else if (serviceCommData) {
                setServiceCommissions(serviceCommData);
              }
            }
          }
        } catch (error) {
          console.error("Error in fetchEmployeeCommissions:", error);
        }
      };

      fetchEmployeeCommissions();
    }
  }, [employeeId]);

  // Update form value for commission_type
  useEffect(() => {
    form.setValue("commission_type", commissionType);
  }, [commissionType, form]);

  // Update form value for template_id
  useEffect(() => {
    form.setValue("commission_template_id", selectedTemplateId);
  }, [selectedTemplateId, form]);

  // Update form value for service_commissions
  useEffect(() => {
    if (serviceCommissions.length > 0) {
      // Convert array of commissions to an object map expected by form submission
      const serviceCommissionMap = serviceCommissions.reduce((acc, commission) => {
        if (commission.service_id && commission.percentage) {
          acc[commission.service_id] = commission.percentage;
        }
        return acc;
      }, {} as Record<string, number>);
      
      form.setValue("service_commissions", serviceCommissionMap);
    } else {
      form.setValue("service_commissions", {});
    }
  }, [serviceCommissions, form]);
  
  // Group services by category
  useEffect(() => {
    if (services.length > 0) {
      // Group services by category
      const categoriesMap = services.reduce((acc, service) => {
        const categoryId = service.category_id || 'uncategorized';
        const categoryName = service.category_name || 'Uncategorized';
        
        if (!acc[categoryId]) {
          acc[categoryId] = {
            id: categoryId,
            name: categoryName,
            services: []
          };
        }
        
        acc[categoryId].services.push(service);
        return acc;
      }, {} as Record<string, ServiceCategory>);
      
      // Convert map to array and sort categories by name
      const categoriesArray = Object.values(categoriesMap).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setServiceCategories(categoriesArray);
    }
  }, [services]);

  // Handle tiered template selection
  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Fetch slabs for the selected template
    if (templateId) {
      const { data, error } = await supabase
        .from("commission_slabs")
        .select("*")
        .eq("template_id", templateId)
        .order("min_amount", { ascending: true });

      if (error) {
        console.error("Error fetching slabs:", error);
        toast.error("Failed to load commission slabs");
      } else if (data && data.length > 0) {
        setSlabs(data);
      }
    }
  };
  
  // Handle service template selection
  const handleServiceTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Fetch service commissions for the selected template
    if (templateId) {
      const { data, error } = await supabase
        .from("service_commissions")
        .select("*")
        .eq("template_id", templateId);

      if (error) {
        console.error("Error fetching service commissions:", error);
        toast.error("Failed to load service commission template");
      } else if (data && data.length > 0) {
        // Update service commissions state
        setServiceCommissions(data);
      }
    }
  };

  // Save tiered commission template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    // Validate slabs
    if (!validateSlabs()) {
      return;
    }

    try {
      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from("commission_templates")
        .insert([
          {
            name: templateName,
            description: templateDescription,
            type: "tiered",
          },
        ])
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert slabs with the new template ID
      const slabsWithTemplateId = slabs.map((slab) => ({
        template_id: templateData.id,
        min_amount: slab.min_amount,
        max_amount: slab.max_amount,
        percentage: slab.percentage,
      }));

      const { error: slabsError } = await supabase
        .from("commission_slabs")
        .insert(slabsWithTemplateId);

      if (slabsError) throw slabsError;

      // Set the selected template to the newly created one
      setSelectedTemplateId(templateData.id);
      
      // Close dialog and refresh templates
      setShowSaveTemplateDialog(false);
      refetchTemplates();
      
      toast.success("Template saved successfully");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(`Failed to save template: ${error.message}`);
    }
  };

  // Save service commission template
  const handleSaveServiceTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    // Validate that at least one service has a commission
    if (serviceCommissions.length === 0) {
      toast.error("Please set commission rates for at least one service");
      return;
    }

    try {
      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from("commission_templates")
        .insert([
          {
            name: templateName,
            description: templateDescription,
            type: "flat",
          },
        ])
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert service commissions with the new template ID
      const serviceCommissionsWithTemplateId = serviceCommissions.map((commission) => ({
        template_id: templateData.id,
        service_id: commission.service_id,
        percentage: commission.percentage,
      }));

      const { error: commissionError } = await supabase
        .from("service_commissions")
        .insert(serviceCommissionsWithTemplateId);

      if (commissionError) throw commissionError;

      // Set the selected template to the newly created one
      setSelectedTemplateId(templateData.id);
      
      // Close dialog and refresh templates
      setShowSaveTemplateDialog(false);
      refetchTemplates();
      
      toast.success("Service commission template saved successfully");
    } catch (error: any) {
      console.error("Error saving service template:", error);
      toast.error(`Failed to save template: ${error.message}`);
    }
  };

  // Add a new slab
  const addSlab = () => {
    const lastSlab = slabs[slabs.length - 1];
    
    // Always calculate the new min amount based on the last slab's max amount
    // If the last max is null (unlimited), use the min amount to calculate the next range
    const newMinAmount = lastSlab.max_amount !== null ? 
      lastSlab.max_amount + 1 : 
      lastSlab.min_amount + 1000; // Add 1000 as a default increment if no max
    
    // Create a copy of the slabs
    const updatedSlabs = [...slabs];
    
    // Always set a max amount for the previous slab
    updatedSlabs[updatedSlabs.length - 1] = {
      ...lastSlab,
      max_amount: newMinAmount - 1,
    };
    
    // Add the new slab with null max (unlimited)
    setSlabs([
      ...updatedSlabs,
      { min_amount: newMinAmount, max_amount: null, percentage: lastSlab.percentage },
    ]);
  };

  // Remove a slab
  const removeSlab = (index: number) => {
    if (slabs.length === 1) {
      toast.error("You must have at least one slab");
      return;
    }

    // Prepare new slabs array
    const newSlabs = [...slabs];
    newSlabs.splice(index, 1);

    // Ensure the last slab has max_amount = null
    if (newSlabs.length > 0) {
      const lastIndex = newSlabs.length - 1;
      newSlabs[lastIndex] = { ...newSlabs[lastIndex], max_amount: null };
    }

    // Update the slabs
    setSlabs(newSlabs);
  };

  // Update slab values
  const updateSlab = (index: number, field: 'min_amount' | 'max_amount' | 'percentage', value: number | null) => {
    const newSlabs = [...slabs];
    newSlabs[index] = { ...newSlabs[index], [field]: value };
    setSlabs(newSlabs);
  };

  // Validate slabs - Check for gaps, overlaps, and valid percentages
  const validateSlabs = (): boolean => {
    // Sort slabs by min_amount
    const sortedSlabs = [...slabs].sort((a, b) => a.min_amount - b.min_amount);

    // Check for valid percentages
    for (let i = 0; i < sortedSlabs.length; i++) {
      const slab = sortedSlabs[i];
      if (slab.percentage < 0 || slab.percentage > 100) {
        toast.error("Commission percentage must be between 0 and 100");
        return false;
      }
    }

    // Check for gaps and overlaps
    for (let i = 0; i < sortedSlabs.length - 1; i++) {
      const currentSlab = sortedSlabs[i];
      const nextSlab = sortedSlabs[i + 1];

      // If the current slab's max is null, it should be the last slab
      if (currentSlab.max_amount === null && i !== sortedSlabs.length - 1) {
        toast.error("Only the last slab can have an unlimited maximum");
        return false;
      }

      // Check that max > min
      if (currentSlab.max_amount !== null && currentSlab.min_amount >= currentSlab.max_amount) {
        toast.error(`Slab ${i + 1}: Minimum must be less than maximum`);
        return false;
      }

      // Check for gaps and overlaps between slabs
      if (currentSlab.max_amount !== null) {
        if (currentSlab.max_amount + 1 !== nextSlab.min_amount) {
          toast.error(`Gap or overlap found between slabs ${i + 1} and ${i + 2}`);
          return false;
        }
      }
    }

    // Check that the last slab has max_amount = null
    const lastSlab = sortedSlabs[sortedSlabs.length - 1];
    if (lastSlab.max_amount !== null) {
      toast.error("The last slab must have an unlimited maximum");
      return false;
    }

    return true;
  };

  // Handle service commission change
  const handleServiceCommissionChange = (serviceId: string, value: string) => {
    const percentage = parseFloat(value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) return;

    // Check if the service exists in the array
    const index = serviceCommissions.findIndex(item => item.service_id === serviceId);
    
    if (index >= 0) {
      const updatedCommissions = [...serviceCommissions];
      updatedCommissions[index] = { ...updatedCommissions[index], percentage };
      setServiceCommissions(updatedCommissions);
    } else {
      setServiceCommissions([
        ...serviceCommissions,
        { service_id: serviceId, percentage }
      ]);
    }
  };
  
  // Handle select all for a category
  const handleSelectAllCategory = (categoryId: string, value: string) => {
    const percentage = parseFloat(value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) return;
    
    // Find the category
    const category = serviceCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Create new commissions for all services in this category
    const categoryServiceIds = category.services.map(service => service.id);
    
    // Create a copy of current commissions excluding this category's services
    const otherCommissions = serviceCommissions.filter(
      commission => !categoryServiceIds.includes(commission.service_id)
    );
    
    // Add new commissions for all services in this category
    const newCategoryCommissions = categoryServiceIds.map(serviceId => ({
      service_id: serviceId,
      percentage
    }));
    
    setServiceCommissions([...otherCommissions, ...newCategoryCommissions]);
  };

  // Get percentage for a service
  const getServicePercentage = (serviceId: string): string => {
    const commission = serviceCommissions.find(item => item.service_id === serviceId);
    return commission ? commission.percentage.toString() : "";
  };

  // Format currency
  const formatCurrency = (value: number | null): string => {
    if (value === null) return "∞";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-3 md:p-6">
      <Card className={isMobile ? "mb-4" : "mb-6"}>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Commission Settings</CardTitle>
          <CardDescription>
            Configure how this staff member receives commissions
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div>
              <FormField
                control={form.control}
                name="commission_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        setCommissionType(value);
                        field.onChange(value);
                      }}
                      defaultValue={field.value || commissionType}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select commission type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flat">Flat (Service-based)</SelectItem>
                        <SelectItem value="tiered">Tiered (Revenue-based)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Flat Commission UI */}
            {commissionType === "flat" && (
              <div className="space-y-6">
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'}`}>
                  <h3 className="text-lg font-medium">Service-specific Commission Rates</h3>
                  <div className={`flex ${isMobile ? 'flex-col w-full' : 'space-x-2'} gap-2`}>
                    <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className={isMobile ? "w-full" : ""}>
                          <Save className="h-4 w-4 mr-2" />
                          Save as Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Service Commissions Template</DialogTitle>
                          <DialogDescription>
                            Create a reusable service commission template that can be applied to other staff members.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input 
                              id="template-name"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                              placeholder="e.g., Standard Service Commission"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="template-description">Description (Optional)</Label>
                            <Input 
                              id="template-description"
                              value={templateDescription}
                              onChange={(e) => setTemplateDescription(e.target.value)}
                              placeholder="Optional description"
                            />
                          </div>
                        </div>
                        
                        <DialogFooter className={isMobile ? "flex-col gap-2" : undefined}>
                          <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)} className={isMobile ? "w-full" : ""}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveServiceTemplate} className={isMobile ? "w-full" : ""}>Save Template</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <FormField
                      control={form.control}
                      name="commission_template_id"
                      render={({ field }) => (
                        <FormItem className={isMobile ? "w-full" : "w-60"}>
                          <Select
                            onValueChange={(value) => {
                              handleServiceTemplateChange(value);
                              field.onChange(value);
                            }}
                            defaultValue={field.value || selectedTemplateId || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Load Template" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {isLoadingServices ? (
                  <div className="flex items-center justify-center p-4">
                    <LoaderCircle className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading services...</span>
                  </div>
                ) : servicesError ? (
                  <div className="text-red-500 p-4 border border-red-200 rounded-md">
                    Error loading services. Please try again.
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-amber-600 p-4 border border-amber-200 rounded-md">
                    No services available. Please add services first.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {serviceCategories.map((category) => (
                      <div key={category.id} className="space-y-4">
                        <div className="border-b pb-2">
                          <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex justify-between items-center'}`}>
                            <h4 className="font-medium text-base">{category.name}</h4>
                            <div className={`flex ${isMobile ? 'w-full' : ''} items-center`}>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="Set all %"
                                id={`category-${category.id}-input`}
                                className={`${isMobile ? 'flex-1' : 'w-24'} mr-2`}
                                onChange={(e) => handleSelectAllCategory(category.id, e.target.value)}
                              />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  const input = document.getElementById(`category-${category.id}-input`) as HTMLInputElement;
                                  if (input && input.value) {
                                    handleSelectAllCategory(category.id, input.value);
                                  }
                                }}
                              >
                                Set All
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 pl-2">
                          {category.services.map((service) => (
                            <div key={service.id} className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-4'} items-center`}>
                              <Label className={`text-sm font-medium ${isMobile ? 'self-start' : ''}`}>{service.name}</Label>
                              <div className={`flex items-center ${isMobile ? 'w-full' : ''}`}>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={getServicePercentage(service.id)}
                                  onChange={(e) => handleServiceCommissionChange(service.id, e.target.value)}
                                  className={`${isMobile ? 'flex-1' : 'w-24'}`}
                                />
                                <span className="ml-2">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tiered Commission UI */}
            {commissionType === "tiered" && (
              <div className="space-y-6">
                <div>
                  <FormField
                    control={form.control}
                    name="commission_template_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Template</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            handleTemplateChange(value);
                            field.onChange(value);
                          }}
                          defaultValue={field.value || selectedTemplateId || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select or create a template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
                    <h3 className="text-lg font-medium">Commission Slabs</h3>
                    <div className={`flex ${isMobile ? 'flex-col w-full' : 'space-x-2'} gap-2`}>
                      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className={isMobile ? "w-full" : ""}>
                            <Save className="h-4 w-4 mr-2" />
                            Save as Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Save Commission Template</DialogTitle>
                            <DialogDescription>
                              Create a reusable commission template that can be applied to other staff members.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="template-name">Template Name</Label>
                              <Input 
                                id="template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Standard Tiered Commission"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="template-description">Description (Optional)</Label>
                              <Input 
                                id="template-description"
                                value={templateDescription}
                                onChange={(e) => setTemplateDescription(e.target.value)}
                                placeholder="Optional description"
                              />
                            </div>
                          </div>
                          
                          <DialogFooter className={isMobile ? "flex-col gap-2" : undefined}>
                            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)} className={isMobile ? "w-full" : ""}>
                              Cancel
                            </Button>
                            <Button onClick={handleSaveTemplate} className={isMobile ? "w-full" : ""}>Save Template</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button onClick={addSlab} size="sm" className={isMobile ? "w-full" : ""}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Slab
                      </Button>
                    </div>
                  </div>
                  
                  <div className={`${isMobile ? 'hidden' : 'grid grid-cols-12 gap-2 font-medium text-sm'}`}>
                    <div className="col-span-5">Min Amount</div>
                    <div className="col-span-5">Max Amount</div>
                    <div className="col-span-1">%</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {slabs.map((slab, index) => (
                    <div key={index} className={isMobile ? "space-y-3 border rounded-md p-3 mb-3" : "grid grid-cols-12 gap-2 items-center"}>
                      {isMobile && (
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-medium">Slab {index + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlab(index)}
                            disabled={slabs.length === 1}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      )}
                      
                      <div className={isMobile ? "space-y-2" : "col-span-5"}>
                        {isMobile && <Label>Minimum Amount</Label>}
                        <Input
                          type="number"
                          min="0"
                          value={slab.min_amount}
                          onChange={(e) => updateSlab(index, 'min_amount', Number(e.target.value))}
                          disabled={index > 0} // Only first slab's min can be edited
                        />
                      </div>
                      
                      <div className={isMobile ? "space-y-2" : "col-span-5"}>
                        {isMobile && <Label>Maximum Amount</Label>}
                        <Input
                          type="number"
                          min={slab.min_amount + 1}
                          value={slab.max_amount === null ? "" : slab.max_amount}
                          onChange={(e) => updateSlab(
                            index,
                            'max_amount',
                            e.target.value === "" ? null : Number(e.target.value)
                          )}
                          placeholder={index === slabs.length - 1 ? "∞" : ""}
                          disabled={index === slabs.length - 1} // Last slab's max is always null
                        />
                      </div>
                      
                      <div className={isMobile ? "space-y-2" : "col-span-1"}>
                        <div className="flex items-center">
                          {isMobile && <Label className="mr-2 min-w-[70px]">Percentage</Label>}
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={slab.percentage}
                            onChange={(e) => updateSlab(index, 'percentage', Number(e.target.value))}
                            className="w-full"
                          />
                          {isMobile && <span className="ml-2">%</span>}
                        </div>
                      </div>
                      
                      {!isMobile && (
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlab(index)}
                            disabled={slabs.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-3">Visualization</h3>
                  <div className="bg-gray-50 p-4 rounded-md border overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="pb-2">Revenue Range</th>
                          <th className="pb-2">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slabs.map((slab, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2">
                              {formatCurrency(slab.min_amount)} - {formatCurrency(slab.max_amount)}
                            </td>
                            <td className="py-2 font-medium">{slab.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
