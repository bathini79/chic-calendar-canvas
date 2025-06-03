import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Search, LoaderCircle, CalendarDays } from "lucide-react";
import { usePayroll } from "@/hooks/use-payroll";
import { PayPeriod, PayRun } from "@/types/payroll-db";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PayTeamWizard } from "./PayTeamWizard";
import { ProcessPaymentsDialog } from "./ProcessPaymentsDialog";
import { PayRunEmployeeList } from "./PayRunEmployeeList";
import { SelectEmployeesDialog } from "./SelectEmployeesDialog";

export function PayRuns() {
  /**
   * Pay Runs Component
   *
   * This component handles the pay runs workflow with the following features:
   * 1. Auto-calculation of pay periods - if no pay periods exist, allows creating one
   * 2. Pay period selection - users can select a pay period from the dropdown
   * 3. Employee listing - shows all employees with payments or zero values when no pay run exists
   * 4. Pay team functionality - allows processing payments for employees
   */
  // Access the query client for manual cache invalidation
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for filters
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);  const [isPaymentDialogOpen, setIsPaymentDialogOpen] =
    useState<boolean>(false);  const [isEmployeeSelectDialogOpen, setIsEmployeeSelectDialogOpen] =
    useState<boolean>(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [hasPaidPayRuns, setHasPaidPayRuns] = useState<boolean>(false);
  const [isCreatingSupplementaryRun, setIsCreatingSupplementaryRun] =
    useState<boolean>(false);
  // State for pay period data
  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [isGeneratingPayPeriod, setIsGeneratingPayPeriod] =
    useState<boolean>(false);
  const [isRecalculatingCommissions, setIsRecalculatingCommissions] =
    useState<boolean>(false);
  const [isCreatingPayRun, setIsCreatingPayRun] = useState(false);

  // Custom hooks for data fetching
  const {
    usePayPeriods,
    usePayRuns,
    usePayRunSummary,
    createPayRun,
    processPayments,
    generateNextPayPeriod,
    recalculateCommissions,
  } = usePayroll();

  // Query for pay periods
  const {
    data: payPeriods,
    isLoading: isLoadingPeriods,
    refetch: refetchPayPeriods,
  } = usePayPeriods("active");
  // Query for pay runs based on selected period
  const {
    data: payRuns,
    isLoading: isLoadingPayRuns,
    refetch: refetchPayRuns,
  } = usePayRuns(
    payPeriod?.start_date,
    payPeriod?.end_date,
    selectedLocation === "all" ? undefined : selectedLocation
  );

  // Get the currently selected pay run
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null);
  // Query for pay run summary, returns zeros if no selected pay run
  const { data: payRunSummary, isLoading: isLoadingSummary } = usePayRunSummary(
    selectedPayRun?.id || ""
  );

  // Load locations on mount
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
  // Check if period has any paid pay runs
  useEffect(() => {
    async function checkForPaidPayRuns() {
      if (!payPeriod) {
        setHasPaidPayRuns(false);
        return;
      }

      try {
        // Query for any paid pay runs in this period
        const { data, error } = await supabase
          .from("pay_runs" as any)
          .select("id, is_supplementary")
          .eq("pay_period_id", payPeriod.id)
          .eq("status", "paid");

        if (error) throw error;

        // Log found pay runs for debugging
        if (data && data.length > 0) {
          console.log("Found paid pay runs for period:", data.length);
          console.log("Pay run details:", data);
        }

        setHasPaidPayRuns(data && data.length > 0);
      } catch (error) {
        console.error("Error checking for paid pay runs:", error);
        setHasPaidPayRuns(false);
      }
    }

    checkForPaidPayRuns();
  }, [payPeriod]);

  // Update the pay period when the selected period ID changes
  useEffect(() => {
    if (selectedPeriod && payPeriods) {
      const period = payPeriods.find((p) => p.id === selectedPeriod);
      setPayPeriod(period || null);
    }
  }, [selectedPeriod, payPeriods]); // Auto-select the most recent pay period when data loads
  // Or generate a new pay period if none exist
  useEffect(() => {
    if (payPeriods?.length && !selectedPeriod) {
      const mostRecent = payPeriods[0]; // Assuming they're ordered by date desc
      setSelectedPeriod(mostRecent.id);
    } else if (
      !isLoadingPeriods &&
      payPeriods &&
      payPeriods.length === 0 &&
      !isGeneratingPayPeriod &&
      !isCreatingPayRun
    ) {
      // Automatically generate the first pay period when no periods exist and we're not currently generating one
      // Also don't generate if we're already creating a pay run
      generatePayPeriod();
    }
  }, [
    payPeriods,
    selectedPeriod,
    isLoadingPeriods,
    isGeneratingPayPeriod,
    isCreatingPayRun,
  ]);

  // Auto-create pay run when we have a pay period but no pay run
  useEffect(() => {
    const autoCreatePayRun = async () => {
      // Only proceed if we have a pay period and we're not already creating or loading
      if (
        payPeriod &&
        !isLoadingPayRuns &&
        !isCreatingPayRun &&
        !hasPaidPayRuns
      ) {
        // Check if there's a matching pay run for this period and location
        const matchingPayRun = payRuns?.find(
          (pr) =>
            pr.pay_period_id === payPeriod.id &&
            (selectedLocation === "all" ||
              pr.location_id === selectedLocation ||
              !pr.location_id)
        );

        if (!matchingPayRun) {
          console.log(
            "Auto-creating pay run for period:",
            payPeriod.id,
            "and location:",
            selectedLocation
          );

          setIsCreatingPayRun(true);

          try {
            // Generate a name for the pay run
            const runName = `Pay Run for ${format(
              new Date(payPeriod.start_date),
              "MMM d"
            )} - ${format(new Date(payPeriod.end_date), "MMM d, yyyy")}`;
            const locationInfo =
              selectedLocation !== "all"
                ? ` (${
                    locations.find((l) => l.id === selectedLocation)?.name ||
                    "Selected Location"
                  })`
                : "";

            const createdPayRun = await createPayRun.mutateAsync({
              payPeriodId: payPeriod.id,
              name: runName + locationInfo,
              locationId:
                selectedLocation === "all" ? undefined : selectedLocation,
              onlyUnpaid: false,
            });

            console.log("Successfully created pay run:", createdPayRun);
            setSelectedPayRun(createdPayRun);
            await refetchPayRuns();
          } catch (error) {
            console.error("Failed to create pay run:", error);
          } finally {
            setIsCreatingPayRun(false);
          }
        }
      }
    };

    // Call the auto-create function
    autoCreatePayRun();
  }, [
    payPeriod,
    payRuns,
    isLoadingPayRuns,
    isCreatingPayRun,
    selectedLocation,
    hasPaidPayRuns,
    locations,
    createPayRun,
    refetchPayRuns,
  ]);

  // Handle generating a new pay period when none exist
  const generatePayPeriod = () => {
    setIsGeneratingPayPeriod(true);
    generateNextPayPeriod.mutate(undefined, {
      onSuccess: () => {
        // After generating a new pay period, refetch the list
        refetchPayPeriods();
      },
      onSettled: () => {
        // Whether success or failure, we're done generating
        setIsGeneratingPayPeriod(false);
      },
    });
  }; // Update selected pay run when pay runs data changes
  useEffect(() => {
    // Only set the pay run if we have a selected period
    if (selectedPeriod) {
      if (payRuns && payRuns.length > 0) {
        // Find a pay run for the current period and location
        const matchingPayRun = payRuns.find(
          (pr) =>
            pr.pay_period_id === selectedPeriod &&
            (selectedLocation === "all" ||
              pr.location_id === selectedLocation ||
              !pr.location_id)
        );

        // If we found a matching pay run, use it
        if (matchingPayRun) {
          console.log("Found matching pay run:", matchingPayRun.id);
          // Only update if it's different to avoid infinite loops
          if (!selectedPayRun || selectedPayRun.id !== matchingPayRun.id) {
            setSelectedPayRun(matchingPayRun);
          }
        } else {
          // No matching pay run found
          console.log("No matching pay run found for period", selectedPeriod);
          // Only set to null if we currently have a pay run selected
          // This avoids unnecessary re-renders and auto-creation cycles
          if (selectedPayRun !== null && !isCreatingPayRun) {
            setSelectedPayRun(null);
          }
        }
      } else if (selectedPayRun !== null && payRuns && !isCreatingPayRun) {
        // No pay runs at all, set to null to trigger auto-creation
        // Only if we're not already in the process of creating one
        setSelectedPayRun(null);
      }
    } else if (selectedPayRun !== null) {
      // No selected period, set to null
      setSelectedPayRun(null);
    }
  }, [
    payRuns,
    selectedPeriod,
    selectedLocation,
    selectedPayRun,
    isCreatingPayRun,
  ]); // Handle manual pay run creation
  const handleCreatePayRun = (isSupplementary = false) => {
    if (!payPeriod) return;

    console.log(
      `Creating ${isSupplementary ? "supplementary" : "regular"} pay run...`
    );
    console.log("hasPaidPayRuns:", hasPaidPayRuns);

    // Check if we should open the wizard or create directly
    if (isWizardNeeded()) {
      // Complex case - use the wizard
      setIsWizardOpen(true);
    } else {
      // Simple case - create directly
      setIsCreatingPayRun(true);
      if (isSupplementary) {
        setIsCreatingSupplementaryRun(true);
      }

      // Generate appropriate name based on type
      let runName = `Pay Run for ${format(
        new Date(payPeriod.start_date),
        "MMM d"
      )} - ${format(new Date(payPeriod.end_date), "MMM d, yyyy")}`;
      if (isSupplementary) {
        runName = `Supplementary ${runName}`;
      }

      if (selectedLocation !== "all") {
        const locationName = locations.find(
          (l) => l.id === selectedLocation
        )?.name;
        if (locationName) {
          runName += ` (${locationName})`;
        }
      }

      console.log("Creating pay run with params:", {
        name: runName,
        payPeriodId: payPeriod.id,
        locationId: selectedLocation === "all" ? undefined : selectedLocation,
        onlyUnpaid: isSupplementary,
      });

      createPayRun.mutate(
        {
          payPeriodId: payPeriod.id,
          name: runName,
          locationId: selectedLocation === "all" ? undefined : selectedLocation,
          onlyUnpaid: isSupplementary,
        },
        {
          onSuccess: (createdPayRun) => {
            console.log(
              `Successfully created ${
                isSupplementary ? "supplementary" : ""
              } pay run manually:`,
              createdPayRun
            );
            // Force refresh data
            queryClient.invalidateQueries({ queryKey: ["pay-runs"] });
            refetchPayRuns();
          },
          onError: (error) => {
            console.error(
              `Error creating ${
                isSupplementary ? "supplementary" : ""
              } pay run:`,
              error
            );
          },
          onSettled: () => {
            setIsCreatingPayRun(false);
            setIsCreatingSupplementaryRun(false);
          },
        }
      );
    }
  };

  // Determine if we need the wizard for complex configuration
  const isWizardNeeded = () => {
    // For now, always use the simple flow
    // This can be expanded later if needed for complex configurations
    return false;
  }; // Handle when a pay run is created from the wizard

  // Handle when a pay run is created from the wizard
  const handlePayRunCreated = () => {
    // This will be called after the wizard successfully creates a pay run
    // Force a refresh of the pay runs data
    refetchPayRuns();
  };  // Open the employee selection dialog first
  const handleProcessPayments = () => {
    if (!selectedPayRun) return;

    // Add extra information for supplementary pay runs
    console.log(
      "Processing payments, is supplementary:",
      selectedPayRun.is_supplementary
    );

    // Open the employee selection dialog first
    setIsEmployeeSelectDialogOpen(true);
  }; 
    // Handle employee selection completion
  const handleEmployeeSelection = (employeeIds: string[]) => {
    if (employeeIds.length === 0) {
      // No employees selected, show warning and keep dialog open
      toast({
        title: "No team members selected",
        description: "Please select at least one team member to proceed with payments.",
        variant: "warning"
      });
      return; // Don't close the dialog
    }
    
    setSelectedEmployeeIds(employeeIds);
    setIsEmployeeSelectDialogOpen(false);
    
    // Now open the payment confirmation dialog
    setIsPaymentDialogOpen(true);
  };
  // Process the payments after confirmation
  const confirmProcessPayments = async () => {
    if (!selectedPayRun) return;

    try {
      console.log("Processing payments for pay run:", selectedPayRun.id);
      console.log("Current toPay value:", payRunSummary?.toPay);
      console.log("Selected employee IDs:", selectedEmployeeIds);

      // Use the selected employee IDs if they exist, otherwise get all unpaid items
      let employeeIds = selectedEmployeeIds;
      
      // Only query for unpaid items if no specific employees were selected
      if (!employeeIds.length) {
        console.log("No specific employees selected, fetching all unpaid items");
        const { data: payRunItems, error: fetchError } = await supabase
          .from("pay_run_items" as any)
          .select("employee_id")
          .eq("pay_run_id", selectedPayRun.id)
          .eq("is_paid", false);

        if (fetchError) {
          toast({
            title: "Error fetching unpaid items",
            description: fetchError.message || "Failed to fetch unpaid payment items",
            variant: "destructive"
          });
          throw fetchError;
        }
        
        if (!payRunItems?.length) {
          toast({
            title: "Nothing to process",
            description: "No unpaid items were found for this pay run",
            variant: "warning"
          });
          setIsPaymentDialogOpen(false);
          return;
        }

        employeeIds = [...new Set(payRunItems.map((item) => item.employee_id))];
        console.log("Found unpaid items for employees:", employeeIds);
      } else {
        // For selected employees, verify they have unpaid items
        console.log("Verifying unpaid items for selected employees:", employeeIds);
        const { data: verifyItems, error: verifyError } = await supabase
          .from("pay_run_items" as any)
          .select("employee_id, count")
          .eq("pay_run_id", selectedPayRun.id)
          .eq("is_paid", false)
          .in("employee_id", employeeIds);
        
        if (verifyError) {
          console.error("Error verifying unpaid items:", verifyError);
          // Continue with selected employees despite error
        } else if (!verifyItems?.length) {
          toast({
            title: "No unpaid items",
            description: "The selected team members have no unpaid items to process",
            variant: "warning"
          });
          setIsPaymentDialogOpen(false);
          return;
        }
      }
      
      console.log("Processing payments for employees:", employeeIds);
      
      // Validation: verify we have employees to process
      if (employeeIds.length === 0) {
        toast({
          title: "No team members to process",
          description: "Please select at least one team member with unpaid items",
          variant: "warning"
        });
        return;
      }
      
      // Generate a unique payment reference
      const paymentReference = `PAY-${selectedPayRun.id}-${format(
        new Date(),
        "yyyyMMdd-HHmmss"
      )}`;

      // Update payment status using the new function with the payment reference
      const { error: updateError } = await supabase.rpc(
        "update_pay_run_items_payment_status",
        {
          p_pay_run_id: selectedPayRun.id,
          p_employee_ids: employeeIds,
          p_payment_reference: paymentReference,
        }
      );

      if (updateError) {
        toast({
          title: "Error updating payment status",
          description: updateError.message || "Failed to update payment status",
          variant: "destructive"
        });
        throw updateError;
      }

      // Process payments through the payment service
      await processPayments.mutateAsync({
        payRunId: selectedPayRun.id,
        employeeIds,
      });

      console.log("Payments processed successfully, refreshing data...");
      
      // Show success message with more detailed information
      toast({
        title: "Payments processed successfully",
        description: selectedEmployeeIds.length 
          ? `Processed payments for ${employeeIds.length} selected team member${employeeIds.length !== 1 ? 's' : ''}`
          : `Processed payments for all ${employeeIds.length} team member${employeeIds.length !== 1 ? 's' : ''}`,
        variant: "success"
      });      // Force refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ["pay-runs"] });
      queryClient.invalidateQueries({
        queryKey: ["pay-run-details", selectedPayRun.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["pay-run-summary", selectedPayRun.id],
      });
      // Explicitly invalidate the employee summaries to update the "To Pay" amounts
      queryClient.invalidateQueries({
        queryKey: ["pay-run-employee-summaries", selectedPayRun.id],
      });
      refetchPayRuns();

      // Reset selected employee IDs and close the payment dialog
      setSelectedEmployeeIds([]);
      setIsPaymentDialogOpen(false);
    } catch (error: any) {
      console.error("Error processing payments:", error);
      toast({
        title: "Payment processing failed",
        description: error.message || "There was an error processing payments",
        variant: "destructive"
      });
      // We've handled the error here, no need to re-throw
    }
  };
  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Reset component state on unmount
  useEffect(() => {
    return () => {
      // Cleanup function
      setSelectedPeriod(null);
      setSelectedPayRun(null);
      setPayPeriod(null);
    };
  }, []);

  // Determine if the page is in a loading state
  const isLoading =
    isLoadingPeriods ||
    isLoadingPayRuns ||
    isLoadingSummary ||
    isCreatingPayRun ||
    isRecalculatingCommissions;
  // Determine if we are specifically waiting for a pay run to be created/fetched
  const isWaitingForPayRun =
    !isLoadingPeriods &&
    payPeriod &&
    !selectedPayRun &&
    (isLoadingPayRuns || isCreatingPayRun);  // Function to force refresh all data
  const refreshData = () => {
    console.log("Force refreshing all data...");
    refetchPayPeriods();
    refetchPayRuns();

    if (selectedPayRun?.id) {
      // Force invalidate queries for this specific pay run
      queryClient.invalidateQueries({
        queryKey: ["pay-run-summary", selectedPayRun.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["pay-run-details", selectedPayRun.id],
      });
      // Also invalidate employee summaries to update "To Pay" amounts
      queryClient.invalidateQueries({
        queryKey: ["pay-run-employee-summaries", selectedPayRun.id],
      });
    }
  };

  // Handle commission recalculation
  const handleRecalculateCommissions = () => {
    if (!selectedPayRun) return;

    setIsRecalculatingCommissions(true);
    recalculateCommissions.mutate(selectedPayRun.id, {
      onSuccess: () => {
        console.log("Successfully recalculated commissions");
        refreshData();
      },
      onError: (error) => {
        console.error("Failed to recalculate commissions:", error);
      },
      onSettled: () => {
        setIsRecalculatingCommissions(false);
      },
    });
  };

  return (
    <div className="py-3 md:py-4 px-1 sm:px-2 w-full">
      <div className="mb-2 md:mb-4">
        <h1 className="text-xl md:text-2xl font-semibold mb-1">Pay runs</h1>
        <p className="text-muted-foreground text-sm">
          Calculate and settle the amount owed to your team for tips,
          commissions, and wages.
        </p>
      </div>
      {/* Filters */}{" "}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 mb-3 md:mb-5">
        <div className="w-full md:w-1/2">
          {payPeriods?.length === 0 ? (
            <div className="flex gap-1 items-center">
              <Select
                value={selectedPeriod || ""}
                onValueChange={setSelectedPeriod}
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No pay periods available" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 text-sm text-center text-muted-foreground">
                    No pay periods available
                  </div>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={generatePayPeriod}
                disabled={generateNextPayPeriod.isPending}
              >
                {generateNextPayPeriod.isPending ? (
                  <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                ) : null}
                Generate Period
              </Button>
            </div>
          ) : (
            <Select
              value={selectedPeriod || ""}
              onValueChange={setSelectedPeriod}
              disabled={isLoadingPeriods}
            >
              {" "}
              <SelectTrigger>
                {isLoadingPeriods ? (
                  <div className="flex items-center">
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    <span>Loading pay periods...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select pay period">
                    {payPeriod
                      ? `${format(
                          new Date(payPeriod.start_date),
                          "MMM d"
                        )} - ${format(
                          new Date(payPeriod.end_date),
                          "MMM d, yyyy"
                        )}`
                      : "Select pay period"}
                  </SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                {payPeriods?.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {format(new Date(period.start_date), "MMM d")} -{" "}
                    {format(new Date(period.end_date), "MMM d, yyyy")}
                  </SelectItem>
                ))}
                <div className="p-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={generatePayPeriod}
                    disabled={generateNextPayPeriod.isPending}
                  >
                    {generateNextPayPeriod.isPending ? (
                      <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                    ) : null}
                    Generate Next Period
                  </Button>
                </div>
              </SelectContent>
            </Select>
          )}
        </div>{" "}
        <div className="w-full md:w-1/2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="All locations">
                {selectedLocation === "all"
                  ? "All locations"
                  : locations.find((l) => l.id === selectedLocation)?.name ||
                    "All locations"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="hidden md:grid md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Earnings</div>
            <div className="text-2xl font-semibold">
              {isLoading ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(payRunSummary?.earnings || 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Other</div>
            <div className="text-2xl font-semibold">
              {isLoading ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(payRunSummary?.other || 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total</div>
            <div className="text-2xl font-semibold">
              {isLoading ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(payRunSummary?.total || 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Paid</div>
            <div className="text-2xl font-semibold">
              {isLoading ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(payRunSummary?.paid || 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">To pay</div>
            <div className="text-2xl font-semibold">
              {isLoading ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(payRunSummary?.toPay || 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>{" "}
      {/* Mobile Summary - Based on cleaner layout from screenshot 3 */}
      <div className="md:hidden mb-3 space-y-0.5 bg-white p-2 rounded-md shadow-sm">
        <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
          <div className="text-sm">Earnings</div>
          <div className="text-sm font-medium">
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              formatCurrency(payRunSummary?.earnings || 0)
            )}
          </div>
        </div>{" "}
        <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
          <div className="text-sm">Other</div>
          <div className="text-sm font-medium">
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              formatCurrency(payRunSummary?.other || 0)
            )}
          </div>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
          <div className="text-sm font-medium">Total</div>
          <div className="text-sm font-medium">
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              formatCurrency(payRunSummary?.total || 0)
            )}
          </div>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
          <div className="text-sm">Paid</div>
          <div className="text-sm font-medium">
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              formatCurrency(payRunSummary?.paid || 0)
            )}
          </div>
        </div>
        <div className="flex justify-between items-center py-0.5">
          <div className="text-sm font-semibold text-primary">To pay</div>
          <div className="text-sm font-semibold text-primary">
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              formatCurrency(payRunSummary?.toPay || 0)
            )}
          </div>
        </div>
      </div>{" "}
      {/* Desktop: Pay Team and Recalculate Commissions Buttons on right, Search on left */}
      <div className="hidden md:flex justify-between items-center mb-3 gap-1">
        {/* Search on left for desktop */}
        <div className="w-1/3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by team member"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 py-1 h-8 text-sm w-full"
            />
          </div>
        </div>{" "}
        {/* Buttons on right for desktop */}{" "}
        <div className="flex gap-2">
          {/* Always show recalculate button */}
          <Button
            onClick={handleRecalculateCommissions}
            disabled={false}
            variant="outline"
            className="text-sm h-8 py-0 px-3"
          >
            {isRecalculatingCommissions ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 mr-1 animate-spin" />
                Recalculating...
              </>
            ) : (
              "Recalculate Commissions"
            )}
          </Button>

          {selectedPayRun && (
            <Button
              onClick={handleProcessPayments}
              disabled={false}
              className="h-8 py-0 px-3 text-sm bg-black text-white hover:bg-gray-800"
            >
              {processPayments.isPending ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay Team"
              )}
            </Button>
          )}
        </div>
      </div>
      {/* Mobile: First row of buttons, second row search */}
      <div className="md:hidden space-y-2 mb-3">
        {/* Buttons in first row */}{" "}
        <div className="flex justify-between items-center gap-1">
          {" "}
          <div className="flex-1 flex-shrink-0">
            {/* Always show recalculate button */}
            <Button
              onClick={handleRecalculateCommissions}
              disabled={false}
              variant="outline"
              className="text-xs w-full h-8 py-0 px-1"
            >
              {isRecalculatingCommissions ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Recalculating...
                </>
              ) : (
                "Recalculate Commissions"
              )}
            </Button>
          </div>{" "}
          <div className="flex-1 flex-shrink-0">
            {selectedPayRun && (
              <Button
                onClick={handleProcessPayments}
                disabled={false}
                className="w-full h-8 py-0 px-1 text-xs bg-black text-white hover:bg-gray-800"
              >
                {processPayments.isPending ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay Team"
                )}
              </Button>
            )}
          </div>
        </div>
        {/* Search in second row for mobile */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by team member"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 py-1 h-8 text-xs w-full"
          />
        </div>
      </div>      {/* Pay Team Wizard */}{" "}
      <PayTeamWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        payPeriod={payPeriod}
        onPayRunCreated={handlePayRunCreated}
      />
      
      {/* Employee Selection Dialog */}
      {selectedPayRun && (
        <SelectEmployeesDialog
          open={isEmployeeSelectDialogOpen}
          onClose={() => setIsEmployeeSelectDialogOpen(false)}
          onConfirm={handleEmployeeSelection}
          locationId={selectedLocation === "all" ? undefined : selectedLocation}
        />
      )}
        {/* Process Payments Dialog */}
      {selectedPayRun && payRunSummary && (
        <ProcessPaymentsDialog
          open={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          onConfirm={confirmProcessPayments}
          totalAmount={payRunSummary.toPay}
          employeeCount={selectedEmployeeIds.length || payRunSummary.total_employees || 0}
          isSupplementary={selectedPayRun.is_supplementary || false}
          selectedEmployeeIds={selectedEmployeeIds}
          payRunId={selectedPayRun.id}
        />
      )}
      {/* Employee List */}
      <div className="space-y-4">
        {" "}
        {isLoadingPayRuns || isCreatingPayRun || isRecalculatingCommissions ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">
              {isCreatingPayRun
                ? isCreatingSupplementaryRun
                  ? "Creating supplementary pay run..."
                  : "Creating pay run..."
                : isRecalculatingCommissions
                ? "Recalculating commissions..."
                : "Loading..."}
            </p>
          </div>
        ) : (
          <>
            {/* Column headers (desktop only) */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground border-b">
              <div style={{ width: "180px" }}>Team member & locations</div>
              <div className="flex flex-1 items-center justify-end gap-8">
                <div className="w-24 text-right">Earnings</div>
                <div className="w-24 text-right">Other</div>
                <div className="w-24 text-right">Total</div>
                <div className="w-24 text-right">Paid</div>
                <div className="w-24 text-right">To pay</div>
                <div className="w-28 text-right">Actions</div>
              </div>
            </div>{" "}
            {/* Employee list component - always use PayRunEmployeeList with proper data */}
            {selectedPayRun ? (
              <>
                {selectedPayRun.is_supplementary && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-amber-600" />
                    <p>
                      This is a supplementary pay run for services that were
                      added after a previous pay run was completed.
                    </p>
                  </div>
                )}
                <PayRunEmployeeList
                  payRunId={selectedPayRun.id}
                  searchQuery={searchQuery}
                  locationId={
                    selectedLocation === "all" ? undefined : selectedLocation
                  }
                />
              </>
            ) : isWaitingForPayRun || isCreatingPayRun ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  {/* Outer spinning ring */}
                  <div className="w-16 h-16 rounded-full border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent animate-spin"></div>
                  {/* Inner pulsing circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-primary/10 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="mt-6 space-y-2 text-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Setting up your pay run
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[300px]">
                    {isCreatingPayRun
                      ? "Creating a new pay run for your team..."
                      : "Preparing payment calculations..."}
                  </p>
                </div>
              </div>
            ) : (
              <PayRunEmployeeList
                payRunId=""
                searchQuery={searchQuery}
                locationId={
                  selectedLocation === "all" ? undefined : selectedLocation
                }
              />
            )}
          </>
        )}{" "}
      </div>
    </div>
  );
}

export default PayRuns;
