import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoaderCircle, PlusCircle, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  slabs: TieredSlab[];
  created_at?: string;
  updated_at?: string;
}

interface TieredSlab {
  id?: string;
  template_id?: string;
  min_amount: number;
  max_amount: number;
  percentage: number;
  order?: number;
}

// Define props interface
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
  // State for commission slabs management
  const [slabs, setSlabs] = useState<TieredSlab[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for template handling
  const [templates, setTemplates] = useState<CommissionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");
  const [templateSearch, setTemplateSearch] = useState<string>("");

  // State for service handling
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCommissions, setServiceCommissions] = useState<
    Array<{ service_id: string; employee_id?: string; percentage: number }>
  >([]);
  // Fetch commission templates
  const {
    data: templateData,
    isLoading: templatesLoading,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["commission-templates"],
    queryFn: async () => {
      // Mock data for templates until backend is ready
      const mockTemplates: CommissionTemplate[] = [];

      /* When backend is ready:
      const { data, error } = await supabase
        .from("commission_templates")
        .select("*");

      if (error) {
        throw new Error(error.message);
      }
      
      // Fetch slabs for each template
      const templatesWithSlabs = await Promise.all(
        data.map(async (template) => {
          const { data: slabsData, error: slabsError } = await supabase
            .from("commission_template_slabs")
            .select("*")
            .eq("template_id", template.id)
            .order("order");
          
          if (slabsError) {
            console.error("Error fetching template slabs:", slabsError);
            return {
              ...template,
              slabs: []
            };
          }
          
          return {
            ...template,
            slabs: slabsData || []
          };
        })
      );
      
      return templatesWithSlabs;
      */

      return mockTemplates;
    },
  });
  // Update templates state when data is available
  useEffect(() => {
    if (templateData) {
      setTemplates(templateData);
    }
  }, [templateData]);

  // Query to fetch services and categories
  const { data: serviceData, isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      // Mock data for services and categories
      const mockCategories: ServiceCategory[] = [
        {
          id: "1",
          name: "Hair Services",
          services: [
            {
              id: "101",
              name: "Haircut",
              price: 1000,
              duration: 30,
              category_id: "1",
              category_name: "Hair Services",
            },
            {
              id: "102",
              name: "Hair Coloring",
              price: 3000,
              duration: 90,
              category_id: "1",
              category_name: "Hair Services",
            },
            {
              id: "103",
              name: "Hair Styling",
              price: 2000,
              duration: 60,
              category_id: "1",
              category_name: "Hair Services",
            },
          ],
        },
        {
          id: "2",
          name: "Skin Care",
          services: [
            {
              id: "201",
              name: "Facial",
              price: 2500,
              duration: 60,
              category_id: "2",
              category_name: "Skin Care",
            },
            {
              id: "202",
              name: "Skin Treatment",
              price: 5000,
              duration: 90,
              category_id: "2",
              category_name: "Skin Care",
            },
          ],
        },
        {
          id: "3",
          name: "Nail Services",
          services: [
            {
              id: "301",
              name: "Manicure",
              price: 1500,
              duration: 45,
              category_id: "3",
              category_name: "Nail Services",
            },
            {
              id: "302",
              name: "Pedicure",
              price: 1800,
              duration: 60,
              category_id: "3",
              category_name: "Nail Services",
            },
          ],
        },
      ];

      /* When backend is ready:
      const { data, error } = await supabase
        .from("service_categories")
        .select(`
          id, 
          name,
          services (
            id, 
            name, 
            price, 
            duration,
            description,
            category_id,
            category_name
          )
        `);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data || [];
      */

      return mockCategories;
    },
  });

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );

  // Update service categories when data is available
  useEffect(() => {
    if (serviceData) {
      setServiceCategories(serviceData);
    }
  }, [serviceData]);

  // Filter services based on search term
  const filteredCategories = useMemo(() => {
    if (!serviceSearch.trim()) {
      return serviceCategories;
    }

    const searchTerm = serviceSearch.toLowerCase();
    return serviceCategories
      .map((category) => ({
        ...category,
        services: category.services.filter((service) =>
          service.name.toLowerCase().includes(searchTerm)
        ),
      }))
      .filter((category) => category.services.length > 0);
  }, [serviceCategories, serviceSearch]);

  // Get commission percentage for a service
  const getServiceCommission = (serviceId: string): number => {
    const commission = serviceCommissions.find(
      (sc) => sc.service_id === serviceId
    );
    return commission
      ? commission.percentage
      : form.watch("global_commission_percentage") || 0;
  };

  // Handle changing commission for a service
  const handleServiceCommissionChange = (
    serviceId: string,
    percentage: number
  ) => {
    // Update service commissions
    setServiceCommissions((prev) => {
      const existing = prev.findIndex((sc) => sc.service_id === serviceId);
      const updated = [...prev];

      if (existing >= 0) {
        updated[existing] = { ...updated[existing], percentage };
      } else {
        updated.push({
          service_id: serviceId,
          employee_id: employeeId,
          percentage,
        });
      }

      // Update form data
      const serviceCommissionsMap: { [key: string]: number } = {};
      updated.forEach((sc) => {
        serviceCommissionsMap[sc.service_id] = sc.percentage;
      });
      form.setValue("service_commissions", serviceCommissionsMap);

      return updated;
    });
  };  // Fetch employee's commission data if editing
  const fetchEmployeeCommissions = async () => {
    if (employeeId) {
      try {
        setIsLoading(true);
        
        // First, fetch the employee's basic commission settings
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select("commission_type, commission_template_id")
          .eq("id", employeeId)
          .single();
          
        if (employeeError) {
          console.error("Error fetching employee commission settings:", employeeError);
          // Fall back to default settings
          setSlabs([
            {
              id: "1",
              min_amount: 0,
              max_amount: 999999999,
              percentage: 10,
              order: 1,
            },
          ]);
          return;
        }
        
        // Update the form with the employee's commission type
        if (employeeData.commission_type) {
          form.setValue("commission_type", employeeData.commission_type);
        }
        
        // If using a template, fetch and apply the template
        if (employeeData.commission_template_id) {
          form.setValue("commission_template_id", employeeData.commission_template_id);
          setSelectedTemplateId(employeeData.commission_template_id);
          
          // Attempt to find the template in already loaded templates
          const template = templates.find(t => t.id === employeeData.commission_template_id);
          if (template && template.slabs) {
            setSlabs(template.slabs);
          } else {
            // Template not loaded yet, use default slabs for now
            // In a real implementation, you would fetch the template
            setSlabs([
              {
                id: "1",
                min_amount: 0,
                max_amount: 999999999,
                percentage: 10,
                order: 1,
              },
            ]);
          }
        } 
        // For tiered commission without a template, fetch the employee's slabs
        else if (employeeData.commission_type === 'tiered') {
          const { data: slabsData, error: slabsError } = await supabase
            .from("tiered_commission_slabs")
            .select("*")
            .eq("employee_id", employeeId)
            .order("order_index");
            
          if (slabsError) {
            console.error("Error fetching tiered slabs:", slabsError);
            // Fall back to default slab
            setSlabs([
              {
                id: "1",
                min_amount: 0,
                max_amount: 999999999,
                percentage: 10,
                order: 1,
              },
            ]);
          } else if (slabsData && slabsData.length > 0) {
            // Map database slabs to UI slabs format
            const uiSlabs = slabsData.map(slab => ({
              id: slab.id,
              min_amount: slab.min_amount,
              max_amount: slab.max_amount,
              percentage: slab.percentage,
              order: slab.order_index
            }));
            setSlabs(uiSlabs);
          } else {
            // No slabs found, use default
            setSlabs([
              {
                id: "1",
                min_amount: 0,
                max_amount: 999999999,
                percentage: 10,
                order: 1,
              },
            ]);
          }
        }
        // For flat commission, fetch service-specific commissions
        else if (employeeData.commission_type === 'flat') {
          const { data: rulesData, error: rulesError } = await supabase
            .from("flat_commission_rules")
            .select("*")
            .eq("employee_id", employeeId);
            
          if (rulesError) {
            console.error("Error fetching flat commission rules:", rulesError);
          } else if (rulesData && rulesData.length > 0) {
            // Format for service commissions state
            const serviceCommissionsArr = rulesData.map(rule => ({
              service_id: rule.service_id,
              employee_id: employeeId,
              percentage: rule.percentage
            }));
            
            setServiceCommissions(serviceCommissionsArr);
            
            // Also update form data
            const serviceCommissionsMap: { [key: string]: number } = {};
            serviceCommissionsArr.forEach(sc => {
              serviceCommissionsMap[sc.service_id] = sc.percentage;
            });
            
            form.setValue("service_commissions", serviceCommissionsMap);
          }
        }
      } catch (error) {
        console.error("Error in fetchEmployeeCommissions:", error);
        // Use default settings as a fallback
        setSlabs([
          {
            id: "1",
            min_amount: 0,
            max_amount: 999999999,
            percentage: 10,
            order: 1,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Create new commission template
  const createTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      setIsLoading(true);

      // Create a new template with current slabs
      const newTemplate: CommissionTemplate = {
        id: `temp_${Date.now()}`, // This would be replaced with a real ID from the database
        name: templateName,
        description: templateDescription,
        slabs: [...slabs],
        created_at: new Date().toISOString(),
      };

      /* When backend is ready:
      const { data, error } = await supabase
        .from("commission_templates")
        .insert({
          name: templateName,
          description: templateDescription,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Insert slabs for the template
      const slabsToInsert = slabs.map((slab, index) => ({
        template_id: data.id,
        min_amount: slab.min_amount,
        max_amount: slab.max_amount,
        percentage: slab.percentage,
        order: index + 1
      }));
      
      const { error: slabsError } = await supabase
        .from("commission_template_slabs")
        .insert(slabsToInsert);
      
      if (slabsError) {
        throw slabsError;
      }
      
      // Refetch templates to update the list
      refetchTemplates();
      */
      // For now, just add to local state
      setTemplates((prev) => [...prev, newTemplate]);

      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      toast.success("Template created successfully");
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };
  // Handle selecting a template
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Fetch template slabs and apply immediately
    const template = templates.find((t) => t.id === templateId);
    if (template && template.slabs) {
      setSlabs(template.slabs);
      toast.success(`Applied template: ${template.name}`);
    }
  };
  // Filter templates based on search term
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) {
      return templates;
    }

    const searchTerm = templateSearch.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm) ||
        (template.description &&
          template.description.toLowerCase().includes(searchTerm))
    );
  }, [templates, templateSearch]);
  // This function is now handled directly in handleTemplateChange

  // Handle saving the current commission structure as a template
  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      setIsLoading(true);

      // Create a template object
      const template = {
        name: templateName,
        description: templateDescription,
        type: "tiered",
        slabs: slabs,
      };

      /* Backend integration would go here - for now using mock data
      const { data, error } = await supabase
        .from("commission_templates")
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      */

      // Close dialog and show success message
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");

      // Update local templates list with the new template
      // In a real implementation, we would refetch templates from the server
      const newTemplate = {
        id: `temp-${Date.now()}`,
        ...template,
        created_at: new Date().toISOString(),
      };

      setTemplates((prev) => [...prev, newTemplate]);
      toast.success("Template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsLoading(false);
    }
  };  // Save tiered commission slabs to form data
  // Note: This function updates the form state with the current slabs configuration.
  // The actual database saving is handled in StaffDialog.tsx when the entire form is submitted.
  const saveSlabs = async () => {
    try {
      setIsLoading(true);

      // Validate slabs using the validation utility
      if (!validateSlabs(slabs)) {
        return;
      }

      // Ensure we have continuous slabs without gaps
      const sortedSlabs = [...slabs].sort((a, b) => a.min_amount - b.min_amount);
      
      // Format slabs for saving - ensure order_index is set correctly
      const formattedSlabs = sortedSlabs.map((slab, index) => ({
        min_amount: slab.min_amount,
        max_amount: slab.max_amount,
        percentage: slab.percentage,
        order: index + 1
      }));

      // Update form data for submission - this is what will be used by StaffDialog.tsx
      form.setValue("commission_slabs", formattedSlabs);
      form.setValue("commission_type", "tiered");
      
      // If using a template, store the template ID
      if (selectedTemplateId) {
        form.setValue("commission_template_id", selectedTemplateId);
      } else {
        form.setValue("commission_template_id", null);
      }

      toast.success("Commission structure updated and ready for saving");

      // Ask if user wants to save as template too
      toast("Would you like to save this as a template?", {
        action: {
          label: "Save as Template",
          onClick: () => setShowSaveTemplateDialog(true),
        },
        duration: 5000,
      });
    } catch (error) {
      console.error("Error preparing commission structure:", error);
      toast.error("Failed to update commission structure");
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new slab
  const addSlab = () => {
    // Find the maximum value in existing slabs
    const maxValue = Math.max(...slabs.map((slab) => slab.max_amount));

    // Add a new slab with incremented range
    setSlabs((prev) => [
      ...prev,
      {
        min_amount: maxValue + 1,
        max_amount: maxValue + 100000,
        percentage: 15,
        order: prev.length + 1,
      },
    ]);
  };

  // Remove a slab by index
  const removeSlab = (index: number) => {
    if (slabs.length <= 1) {
      toast.error("Cannot remove the last slab");
      return;
    }

    // Remove the slab at the given index
    setSlabs((prev) => {
      const updated = prev.filter((_, i) => i !== index);

      // Recalculate the min/max values to ensure they are continuous
      return updated.map((slab, i, arr) => {
        if (i === 0) {
          return { ...slab, min_amount: 0, order: 1 };
        } else {
          const prevMax = arr[i - 1].max_amount;
          return { ...slab, min_amount: prevMax + 1, order: i + 1 };
        }
      });
    });
  };

  // Validate tiered commission slabs
  const validateSlabs = (slabsToValidate: TieredSlab[]): boolean => {
    // Check for empty slabs
    if (!slabsToValidate || slabsToValidate.length === 0) {
      toast.error("At least one commission slab is required");
      return false;
    }
    
    // Check each slab for valid values
    for (const slab of slabsToValidate) {
      if (
        slab.min_amount < 0 ||
        (slab.max_amount !== null && slab.max_amount <= slab.min_amount) ||
        slab.percentage < 0 ||
        slab.percentage > 100
      ) {
        toast.error(
          "Invalid slab configuration. Please check min/max values and percentages."
        );
        return false;
      }
    }
    
    // Check for overlapping ranges
    const sortedSlabs = [...slabsToValidate].sort((a, b) => a.min_amount - b.min_amount);
    for (let i = 0; i < sortedSlabs.length - 1; i++) {
      const current = sortedSlabs[i];
      const next = sortedSlabs[i + 1];
      
      if (current.max_amount >= next.min_amount) {
        toast.error("Slab ranges cannot overlap. Please adjust the min/max values.");
        return false;
      }
      
      if (current.max_amount + 1 !== next.min_amount) {
        toast.error("Slab ranges must be continuous without gaps");
        return false;
      }
    }
    
    return true;
  };

  // Update a slab's details
  const updateSlab = (
    index: number,
    field: "min_amount" | "max_amount" | "percentage",
    value: number
  ) => {
    setSlabs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If updating max_amount, update the next slab's min_amount if it exists
      if (field === "max_amount" && index < updated.length - 1) {
        updated[index + 1] = { ...updated[index + 1], min_amount: value + 1 };
      }

      return updated;
    });
  };  // Initialize data on component mount
  useEffect(() => {
    // For existing employees, fetch their commission data
    if (employeeId) {
      fetchEmployeeCommissions();
    } else {
      // Default slabs for new employee - starting with a single basic slab
      setSlabs([
        { min_amount: 0, max_amount: 999999999, percentage: 10, order: 1 },
      ]);
    }

    // Set default commission type to "none" if not already set
    if (!form.getValues("commission_type")) {
      form.setValue("commission_type", "none");
    }
  }, [employeeId]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
      <Card>
        <CardHeader>
          <div
            className={`${
              isMobile
                ? "flex flex-col gap-2"
                : "flex justify-between items-center"
            }`}
          >
            <div>
              <CardTitle>Commission Structure</CardTitle>
              <CardDescription>
                Set up how the staff member earns commission
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`flex flex-col gap-4 sm:flex-row sm:items-end`}>
            <div className="sm:w-64">
              <FormField
                control={form.control}
                name="commission_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select commission type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Commission</SelectItem>
                        <SelectItem value="flat">
                          Flat Service Commission
                        </SelectItem>
                        <SelectItem value="tiered">
                          Tiered Commission
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {form.watch("commission_type") === "tiered" && (
            <div className="space-y-6">
              {" "}
              {/* Tiered commission slabs section */}
              <div className="border rounded-lg p-4">
                <div
                    className={`flex w-full ${
                        isMobile
                            ? "flex-row gap-2 items-center mb-2"
                            : "justify-between items-center mb-4"
                    }`}
                >
                    {/* Search input */}
                    <div
                        className={
                            isMobile
                                ? "flex-1 min-w-0 relative"
                                : "flex-1 min-w-0 relative max-w-xs"
                        }
                    >
                        <Input
                            placeholder="Search templates..."
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            className={`pl-8 h-9 ${isMobile ? "w-full" : ""}`}
                            style={{ minHeight: 36 }}
                        />
                        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    {/* Add Slab button */}
                    <div
                        className={
                            isMobile
                                ? "flex-[0_0_38%] ml-2"
                                : "ml-4 flex-shrink-0"
                        }
                    >
                        <button
                            type="button"
                            onClick={addSlab}
                            className="w-full h-9 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium flex items-center justify-center"
                            style={{ minHeight: 36 }}
                        >
                            Add Slab
                        </button>
                    </div>
                </div>
                <div className="border rounded-md mb-4">
                  {!isMobile ? (
                    // Desktop view - Table layout
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="pb-2 pl-2">Revenue Range</th>
                          <th className="pb-2">Commission</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {slabs.map((slab, index) => (
                          <tr
                            key={index}
                            className="border-b last:border-0 hover:bg-muted/50"
                          >
                            <td className="py-2 pl-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-28">
                                  <Input
                                    type="number"
                                    value={slab.min_amount}
                                    onChange={(e) =>
                                      updateSlab(
                                        index,
                                        "min_amount",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-8 text-xs w-full"
                                    disabled={index === 0} // First slab should always start from 0
                                  />
                                </div>
                                <span>to</span>
                                <div className="w-28">
                                  <Input
                                    type="number"
                                    value={slab.max_amount}
                                    onChange={(e) =>
                                      updateSlab(
                                        index,
                                        "max_amount",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-8 text-xs w-full"
                                    disabled={index === slabs.length - 1} // Last slab max value is fixed
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2">
                              <div className="flex items-center space-x-1 w-24">
                                <Input
                                  type="number"
                                  value={slab.percentage}
                                  onChange={(e) =>
                                    updateSlab(
                                      index,
                                      "percentage",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-xs w-16"
                                />
                                <span className="text-muted-foreground">%</span>
                              </div>
                            </td>
                            <td className="py-2 text-right pr-2">
                              <button
                                type="button"
                                onClick={() => removeSlab(index)}
                                className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                disabled={slabs.length <= 1} // Prevent removing the last slab
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    // Mobile view - Card layout
                    <div className="space-y-4">
                      {slabs.map((slab, index) => (
                        <div
                          key={index}
                          className="border rounded-md p-3 bg-muted/20"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              Slab {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSlab(index)}
                              className="p-1 hover:bg-destructive/10 text-destructive rounded"
                              disabled={slabs.length <= 1}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">
                                Revenue Range
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={slab.min_amount}
                                  onChange={(e) =>
                                    updateSlab(
                                      index,
                                      "min_amount",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-9 text-sm"
                                  disabled={index === 0}
                                  placeholder="Min"
                                />
                                <span>to</span>
                                <Input
                                  type="number"
                                  value={slab.max_amount}
                                  onChange={(e) =>
                                    updateSlab(
                                      index,
                                      "max_amount",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-9 text-sm"
                                  disabled={index === slabs.length - 1}
                                  placeholder="Max"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">
                                Commission Percentage
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={slab.percentage}
                                  onChange={(e) =>
                                    updateSlab(
                                      index,
                                      "percentage",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-9 text-sm w-24"
                                  placeholder="0"
                                />
                                <span className="text-muted-foreground">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={`text-xs text-muted-foreground mt-2 ${
                    isMobile ? "text-sm" : ""
                  }`}
                >
                  <p>
                    The tiered commission structure pays different percentages
                    based on the revenue generated by the staff member.
                  </p>
                  <p className={`${isMobile ? "mt-2" : "mt-1"}`}>
                    {isMobile
                      ? "Example: For a ₹75,000 revenue with tiers of 5% up to ₹50,000 and 10% for ₹50,001-₹100,000, commission would be ₹5,000."
                      : "Example: If a staff member generates ₹75,000 in revenue and the slabs are set at 5% for 0-50,000 and 10% for 50,001-100,000, they would earn ₹2,500 (5% of 50,000) + ₹2,500 (10% of 25,000) = ₹5,000 in commission."}
                  </p>{" "}
                </div>{" "}
                {/* Commission Templates section */}
                <div className="border-t pt-4 mt-4 mb-6">
                  <h4 className="font-medium mb-3">Commission Templates</h4>

                  <div className="flex flex-wrap gap-3 items-center">
                    <div>
                      <Button
                        type="button"
                        onClick={saveSlabs}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          "Save Commission Structure"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Dialog for saving template */}
                <Dialog
                  open={showSaveTemplateDialog}
                  onOpenChange={setShowSaveTemplateDialog}
                >
                  <DialogContent
                    className={`sm:max-w-md ${
                      isMobile ? "w-[calc(100%-2rem)] p-4" : ""
                    }`}
                  >
                    <DialogHeader>
                      {" "}
                      <DialogTitle>Save as Commission Template</DialogTitle>
                      <DialogDescription>
                        Save the current commission structure as a template for
                        future use.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>{" "}
                        <Input
                          id="template-name"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="e.g., Standard Tiered Commission"
                          className="focus:ring-primary"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-description">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="template-description"
                          value={templateDescription}
                          onChange={(e) =>
                            setTemplateDescription(e.target.value)
                          }
                          placeholder="Briefly describe this commission structure"
                          rows={3}
                        />
                      </div>
                    </div>{" "}
                    <DialogFooter
                      className={isMobile ? "flex-col gap-2" : undefined}
                    >
                      <Button
                        variant="outline"
                        onClick={() => setShowSaveTemplateDialog(false)}
                        className={isMobile ? "w-full" : ""}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveAsTemplate}
                        disabled={!templateName.trim() || isLoading}
                        className={isMobile ? "w-full" : ""}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          "Save Template"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {form.watch("commission_type") === "flat" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Service-Specific Commissions</h3>
                <div className="relative w-64">
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-8"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Global percentage setting */}
              <div className="mb-6 p-4 border rounded-lg bg-muted/20">
                <h4 className="text-sm font-medium mb-2">
                  Global Commission Percentage
                </h4>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="Set global percentage"
                    className="w-full max-w-xs"
                    value={form.watch("global_commission_percentage") || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue("global_commission_percentage", value);
                      // Apply to all services
                      const updatedCommissions = [...serviceCommissions];
                      serviceCategories.forEach((category) => {
                        category.services.forEach((service) => {
                          const existing = updatedCommissions.findIndex(
                            (sc) => sc.service_id === service.id
                          );
                          if (existing >= 0) {
                            updatedCommissions[existing].percentage = value;
                          } else {
                            updatedCommissions.push({
                              service_id: service.id,
                              employee_id: employeeId,
                              percentage: value,
                            });
                          }
                        });
                      });
                      setServiceCommissions(updatedCommissions);

                      // Update form data
                      const serviceCommissionsMap: { [key: string]: number } =
                        {};
                      updatedCommissions.forEach((sc) => {
                        serviceCommissionsMap[sc.service_id] = sc.percentage;
                      });
                      form.setValue(
                        "service_commissions",
                        serviceCommissionsMap
                      );
                    }}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This will apply to all services. You can still override
                  individual service commission percentages below.
                </p>
              </div>

              {servicesLoading ? (
                <div className="flex justify-center items-center h-40">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCategories.map((category, index) => (
                    <Accordion
                      key={category.id}
                      type="single"
                      collapsible
                      defaultValue={index === 0 ? category.id : undefined}
                    >
                      <AccordionItem
                        value={category.id}
                        className="border border-border rounded-lg mb-2 last:mb-0 overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <h4 className="text-sm font-medium">
                            {category.name}
                          </h4>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-3 pt-0 border-t">
                          <div className="space-y-2 pt-2">
                            {category.services.map((service) => (
                              <div
                                key={service.id}
                                className="flex justify-between items-center border rounded-lg p-3 bg-muted/30"
                              >
                                <div>
                                  <div className="font-medium">
                                    {service.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(service.price)}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    value={getServiceCommission(service.id)}
                                    onChange={(e) =>
                                      handleServiceCommissionChange(
                                        service.id,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    placeholder="0"
                                    className="w-20 text-right"
                                  />
                                  <span className="text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}{" "}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
