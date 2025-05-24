import React, { useState, useEffect, useMemo } from "react";
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
import {
  LoaderCircle,
  PlusCircle,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

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

  // Get the current value of service_commission_enabled from form
  const serviceCommissionEnabled = form.watch("service_commission_enabled");

  // State for template handling
  const [templates, setTemplates] = useState<CommissionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");
  const [templateSearch, setTemplateSearch] = useState<string>("");

  // State for service handling
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCommissions, setServiceCommissions] = useState<
    Array<{ service_id: string; employee_id?: string; percentage: number }>
  >([]);
  
  // Query to fetch services with categories, supporting pagination and filtering
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );

  // Query to fetch available locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching locations:", error);
        throw error;
      }

      return data || [];
    },
  });

  const { data: serviceData, isLoading: servicesLoading } = useQuery({
    queryKey: ["services", locationFilter, categoryFilter, serviceSearch],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select(
          `
          *,
          services_categories(
            categories (
              id,
              name
            )
          )
        `
        )
        .order("name");

      // Apply location filter if selected
      if (locationFilter) {
        query = query.eq("services_locations.location_id", locationFilter);
      }

      // Apply category filter if selected
      if (categoryFilter) {
        query = query.eq("services_categories.categories.id", categoryFilter);
      }

      // Apply search filter if provided
      if (serviceSearch.trim()) {
        query = query.ilike("name", `%${serviceSearch.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching services:", error);
        throw error;
      }

      // Map DB data to the Service interface
      const processedServices =
        data?.map((service) => {
          const category = service.services_categories?.[0]?.categories;
          return {
            id: service.id,
            name: service.name,
            price: service.selling_price || 0, // Map selling_price to price
            duration: service.duration || 0,
            description: service.description || "",
            category_id: category?.id || "uncategorized",
            category_name: category?.name || "Uncategorized",
          };
        }) || [];

      return processedServices;
    },
  });

  // Group services by category
  useEffect(() => {
    if (serviceData && serviceData.length > 0) {
      // Group services by category
      const categoriesMap = serviceData.reduce((acc, service) => {
        const categoryId = service.category_id || "uncategorized";
        const categoryName = service.category_name || "Uncategorized";

        if (!acc[categoryId]) {
          acc[categoryId] = {
            id: categoryId,
            name: categoryName,
            services: [],
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
    } else {
      setServiceCategories([]);
    }
  }, [serviceData]);
  // Use categories directly since filtering is now done in the query
  const filteredCategories = useMemo(() => {
    return serviceCategories;
  }, [serviceCategories]);

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
  }; // Fetch employee's commission data if editing
  const fetchEmployeeCommissions = async () => {
    if (employeeId) {
      try {
        setIsLoading(true);

        // First, fetch the employee's basic commission settings
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select("commission_type")
          .eq("id", employeeId)
          .single();

        if (employeeError) {
          console.error(
            "Error fetching employee commission settings:",
            employeeError
          );
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

        // For tiered commission without a template, fetch the employee's slabs
        else if (employeeData.commission_type === "tiered") {
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
            const uiSlabs = slabsData.map((slab) => ({
              id: slab.id,
              min_amount: slab.min_amount,
              max_amount: slab.max_amount,
              percentage: slab.percentage,
              order: slab.order_index,
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
        else if (employeeData.commission_type === "flat") {
          const { data: rulesData, error: rulesError } = await supabase
            .from("flat_commission_rules")
            .select("*")
            .eq("employee_id", employeeId);

          if (rulesError) {
            console.error("Error fetching flat commission rules:", rulesError);
          } else if (rulesData && rulesData.length > 0) {
            // Format for service commissions state
            const serviceCommissionsArr = rulesData.map((rule) => ({
              service_id: rule.service_id,
              employee_id: employeeId,
              percentage: rule.percentage,
            }));

            setServiceCommissions(serviceCommissionsArr);

            // Also update form data
            const serviceCommissionsMap: { [key: string]: number } = {};
            serviceCommissionsArr.forEach((sc) => {
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
    const sortedSlabs = [...slabsToValidate].sort(
      (a, b) => a.min_amount - b.min_amount
    );
    for (let i = 0; i < sortedSlabs.length - 1; i++) {
      const current = sortedSlabs[i];
      const next = sortedSlabs[i + 1];

      if (current.max_amount >= next.min_amount) {
        toast.error(
          "Slab ranges cannot overlap. Please adjust the min/max values."
        );
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
  }; // Initialize data on component mount
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

    if (!form.getValues("commission_type")) {
      form.setValue("commission_type", "tiered");
    }
  }, [employeeId]);

  // Set initial service_commission_enabled to true for new employees with no saved state
  useEffect(() => {
    if (
      !employeeId &&
      form.getValues("service_commission_enabled") === undefined
    ) {
      form.setValue("service_commission_enabled", false);
    }
  }, [employeeId, form]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Add debounced search for better performance
  const [searchInput, setSearchInput] = useState("");

  // Debounce search input to avoid too many queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setServiceSearch(searchInput);
    }, 300); // 300ms debounce time

    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-semibold">
                Service Commissions
              </CardTitle>
              <CardDescription>
                Configure service-based commission settings
              </CardDescription>
            </div>
            {
              <FormField
                control={form.control}
                name="service_commission_enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center">
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                          }}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            }
          </div>
        </CardHeader>
        <CardContent>
          {/* Conditionally render commission settings based on toggle */}
          {form.watch("service_commission_enabled") ? (
            <div className="space-y-6">
              {/* Existing commission type selection and settings */}
              <FormField
                control={form.control}
                name="commission_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select commission type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Commission</SelectItem>
                          <SelectItem value="tiered">
                            Tiered Commission
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      ></div>
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
                                    <span className="text-muted-foreground">
                                      %
                                    </span>
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
                                      <line
                                        x1="10"
                                        y1="11"
                                        x2="10"
                                        y2="17"
                                      ></line>
                                      <line
                                        x1="14"
                                        y1="11"
                                        x2="14"
                                        y2="17"
                                      ></line>
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
                                    <line
                                      x1="10"
                                      y1="11"
                                      x2="10"
                                      y2="17"
                                    ></line>
                                    <line
                                      x1="14"
                                      y1="11"
                                      x2="14"
                                      y2="17"
                                    ></line>
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
                                    <span className="text-muted-foreground">
                                      %
                                    </span>
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
                        The tiered commission structure pays different
                        percentages based on the revenue generated by the staff
                        member.
                      </p>
                      <p className={`${isMobile ? "mt-2" : "mt-1"}`}>
                        {isMobile
                          ? "Example: For a ₹75,000 revenue with tiers of 5% up to ₹50,000 and 10% for ₹50,001-₹100,000, commission would be ₹5,000."
                          : "Example: If a staff member generates ₹75,000 in revenue and the slabs are set at 5% for 0-50,000 and 10% for 50,001-100,000, they would earn ₹2,500 (5% of 50,000) + ₹2,500 (10% of 25,000) = ₹5,000 in commission."}
                      </p>{" "}
                    </div>{" "}
                  
                  </div>
                </div>
              )}{" "}
              {form.watch("commission_type") === "flat" && (
                <div>
                  <div className="flex flex-col space-y-4 mb-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">
                        Service-Specific Commissions
                      </h3>{" "}
                      <div className="relative w-64">
                        {" "}
                        <Input
                          placeholder="Search services..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
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
                        </svg>{" "}
                        {searchInput && (
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSearchInput("");
                              setServiceSearch("");
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18"></path>
                              <path d="m6 6 12 12"></path>
                            </svg>
                          </button>
                        )}
                      </div>
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
                            category?.services.forEach((service) => {
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
                          const serviceCommissionsMap: {
                            [key: string]: number;
                          } = {};
                          updatedCommissions.forEach((sc) => {
                            serviceCommissionsMap[sc.service_id] =
                              sc.percentage;
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
                  </div>{" "}
                  {servicesLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">
                        Loading services...
                      </span>
                    </div>
                  ) : serviceData?.length === 0 &&
                    !locationFilter &&
                    !categoryFilter &&
                    !serviceSearch.trim() ? (
                    <div className="flex justify-center items-center flex-col h-40 text-muted-foreground">
                      <div className="mb-2">
                        No services available in the system
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to services page or open add service dialog would go here
                          toast.info(
                            "You can add services in the Services section"
                          );
                        }}
                      >
                        Add Services
                      </Button>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="flex justify-center items-center h-40 text-muted-foreground">
                      No services found matching your criteria
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
                                {category?.services?.map((service) => (
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
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
