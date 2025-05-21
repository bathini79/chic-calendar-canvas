import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog-no-close";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircle, ArrowLeft, AlertCircle, X } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { StaffNewLayout } from "./StaffNewLayout";
import { useIsMobile } from "@/hooks/use-mobile";

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function StaffDialog({
  open,
  onOpenChange,
  employeeId,
}: StaffDialogProps) {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<"form" | "otp" | "done">("form");
  const [verificationCode, setVerificationCode] = useState("");
  const [tempEmployeeData, setTempEmployeeData] = useState<any>(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const queryClient = useQueryClient();
  
  // Auto-submit when verification code is completely filled
  useEffect(() => {
    if (verificationCode.length === 6 && verificationStep === "otp" && !isLoading) {
      // Small delay to allow user to see the full code before submitting
      const timer = setTimeout(handleVerifyOTP, 300);
      return () => clearTimeout(timer);
    }
  }, [verificationCode, verificationStep, isLoading]);

  // Reset error state and verification step when dialog opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setVerificationError(null);
      setVerificationStep("form");
      setVerificationCode("");
      setTempEmployeeData(null);
      setCanResendOtp(false);
      setResendCountdown(0);
    }
  }, [open]);

  // Focus the OTP input when verification step is active
  useEffect(() => {
    if (verificationStep === "otp") {
      // Small delay to ensure components are mounted
      const timer = setTimeout(() => {
        const otpInput = document.querySelector("[data-input-otp]");
        if (otpInput) {
          (otpInput as HTMLElement).focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [verificationStep]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResendOtp(verificationStep === "otp");
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown, verificationStep]);

  // Fetch employee data if editing
  const { data: employeeData } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      try {
        if (!employeeId) return null;
        const { data, error } = await supabase
          .from("employees")
          .select(`
            *,
            employee_skills(service_id),
            employee_locations(location_id)
          `)
          .eq("id", employeeId)
          .single();

        if (error) throw error;
        return data;
      } catch (err: any) {
        console.error("Error fetching employee data:", err);
        setError(err);
        return null;
      }
    },
    enabled: !!employeeId && open,
  });

  const handleFormSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      // If editing existing employee
      if (employeeId) {
        // Make sure phone doesn't contain + prefix
        const phone = data.phone.replace(/^\+/, "");

        // Create the employee update payload
        const employeeUpdatePayload: any = {
          name: data.name,
          email: data.email || `${phone.replace(/\D/g, "")}@staff.internal`, // Ensure email is never null
          phone: phone,
          photo_url: data.photo_url,
          status: data.status,
          employment_type_id: data.employment_type_id,
        };

        // Add commission fields if provided
        if (data.commission_type) {
          employeeUpdatePayload.commission_type = data.commission_type;
          employeeUpdatePayload.commission_template_id = data.commission_template_id || null;
        }
        
        const { error } = await supabase
          .from("employees")
          .update(employeeUpdatePayload)
          .eq("id", employeeId);

        if (error) throw error;

        // Delete existing skills
        const { error: skillsDeleteError } = await supabase
          .from("employee_skills")
          .delete()
          .eq("employee_id", employeeId);

        if (skillsDeleteError) throw skillsDeleteError;

        // Delete existing location assignments
        const { error: locationsDeleteError } = await supabase
          .from("employee_locations")
          .delete()
          .eq("employee_id", employeeId);

        if (locationsDeleteError) throw locationsDeleteError;

        // Insert skills
        if (data.skills.length > 0) {
          const skillsToInsert = data.skills.map((skillId: string) => ({
            employee_id: employeeId,
            service_id: skillId,
          }));

          const { error: skillsInsertError } = await supabase
            .from("employee_skills")
            .insert(skillsToInsert);

          if (skillsInsertError) throw skillsInsertError;
        }

        // Insert location assignments
        if (data.locations.length > 0) {
          const locationsToInsert = data.locations.map((locationId: string) => ({
            employee_id: employeeId,
            location_id: locationId,
          }));

          const { error: locationsInsertError } = await supabase
            .from("employee_locations")
            .insert(locationsToInsert);
            
          if (locationsInsertError) throw locationsInsertError;
        }

        // Handle flat commission type with no template
        if (data.commission_type === 'flat' && !data.commission_template_id && data.service_commissions) {
          // Delete existing flat commission rules first 
          await supabase.rpc('commission_delete_all_for_employee', { 
            employee_id_param: employeeId 
          });
          
          // Format and save flat commission rules
          if (Object.keys(data.service_commissions).length > 0) {
            const flatRules = Object.entries(data.service_commissions).map(([serviceId, percentage]) => ({
              service_id: serviceId,
              percentage: percentage
            }));

            const { error: flatError } = await supabase.rpc('commission_save_flat_rules', { 
              employee_id_param: employeeId,
              rules_json: flatRules
            });

            if (flatError) throw flatError;
          }
        }
          
        // Handle tiered commission type with no template
        if (data.commission_type === 'tiered' && !data.commission_template_id && data.commission_slabs) {
          // Delete is already handled by the function above
          
          // Format and save tiered slabs
          if (data.commission_slabs && data.commission_slabs.length > 0) {
            const tieredSlabs = data.commission_slabs.map((slab: any, index: number) => ({
              min_amount: slab.min_amount,
              max_amount: slab.max_amount,
              percentage: slab.percentage,
              order_index: index + 1
            }));
              
            const { error: tieredError } = await supabase.rpc('commission_save_tiered_slabs', { 
              employee_id_param: employeeId,
              slabs_json: tieredSlabs
            });
                  
            if (tieredError) throw tieredError;
          }
        }

        toast.success("Staff member updated successfully");
        // Invalidate all queries related to employees to ensure complete refresh
        queryClient.invalidateQueries({
          queryKey: ["employees-with-locations"],
        });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });

        // Allow some time for data to update before closing the dialog
        setTimeout(() => {
          onOpenChange(false);
        }, 300);
      }
      // Creating new employee - first create temporary record and send OTP
      else {
        // Get the current window location to create the verification link
        const baseUrl = window.location.origin;

        // Store form data for later use and ensure phone doesn't have + prefix
        const updatedData = { ...data };
        updatedData.phone = data.phone.replace(/^\+/, "");
        setTempEmployeeData(updatedData);

        // Call the employee-onboarding edge function to create temporary employee record and send OTP
        const { data: responseData, error } = await supabase.functions.invoke(
          "employee-onboarding",
          {
            body: {
              employeeData: {
                ...updatedData,
                status: "inactive", // Always set to inactive for new employees
                baseUrl,
              },
              sendWelcomeMessage: false,
              createAuthAccount: false,
              sendVerificationLink: false,
              sendOtp: true, // Request an OTP generation
              templateName: "staff_verification", // Add template name for 2Factor
            },
          }
        );

        if (error) throw error;

        if (!responseData?.success) {
          throw new Error(
            responseData?.message ||
              "Failed to create temporary employee record"
          );
        }

        // Move to OTP verification step
        setVerificationStep("otp");
        setResendCountdown(30);
        toast.success("Verification code sent to " + data.phone);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save staff member");
      console.error("Error in staff flow:", error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification and complete staff creation
  const handleVerifyOTP = async () => {
    if (!verificationCode || !tempEmployeeData) {
      toast.error("Verification code is required");
      return;
    }

    try {
      setIsLoading(true);

      // Verify the OTP
      const { data: verifyData, error: verifyError } =
        await supabase.functions.invoke("verify-employee-code", {
          body: {
            phoneNumber: tempEmployeeData.phone,
            code: verificationCode,
          },
        });

      if (verifyError) {
        throw verifyError;
      }
      if (!verifyData?.success) {
        // For any verification error, just show the error message
        // but keep the dialog open for retry
        const errorMessage = verifyData?.message || "Invalid verification code";
        setVerificationError(errorMessage);
        toast.error(errorMessage);
        setVerificationCode(""); // Clear the verification code for retry
        setIsLoading(false);
        return; // Return early without closing the dialog
      }

      // Clear any previous errors on success
      setVerificationError(null);

      // OTP verified, complete employee creation
      const baseUrl = window.location.origin;

      const { data: completeData, error: completeError } =
        await supabase.functions.invoke("employee-onboarding", {
          body: {
            employeeData: {
              ...tempEmployeeData,
              id: verifyData.employeeId,
              status: "active", // Set to active since it's verified
              baseUrl,
            },
            sendWelcomeMessage: true,
            createAuthAccount: true,
            sendVerificationLink: false,
          },
        });

      if (completeError) {
        throw completeError;
      }

      if (!completeData?.success) {
        throw new Error(
          completeData?.message || "Failed to complete staff creation"
        );
      }

      toast.success("Staff member verified and created successfully!");
      // Invalidate the employees query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["employees-with-locations"] });
      setVerificationStep("done");

      // Close dialog after a short delay to show success state
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      // For any errors related to OTP verification, keep dialog open
      const isOtpValidationError =
        error.message?.toLowerCase().includes("verification") ||
        error.message?.toLowerCase().includes("code") ||
        error.message?.toLowerCase().includes("invalid") ||
        error.message?.toLowerCase().includes("otp");

      if (isOtpValidationError) {
        // For OTP validation errors, show toast but keep dialog open
        toast.error(error.message || "Invalid verification code");
        setVerificationCode(""); // Clear the code field for retry
      } else {
        // For other errors, show toast and close dialog
        toast.error(error.message || "Verification failed");
        console.error("Error verifying staff:", error);
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resending OTP
  const handleResendOTP = async () => {
    if (!tempEmployeeData) {
      toast.error("No employee data found");
      return;
    }

    try {
      setIsLoading(true);
      setCanResendOtp(false);
      setResendCountdown(30);

      // Get the current window location to create the verification link
      const baseUrl = window.location.origin;

      // Call the employee-onboarding edge function to resend OTP
      const { data: responseData, error } = await supabase.functions.invoke(
        "employee-onboarding",
        {
          body: {
            employeeData: {
              ...tempEmployeeData,
              baseUrl,
            },
            sendWelcomeMessage: false,
            createAuthAccount: false,
            sendVerificationLink: false,
            sendOtp: true, // Request an OTP generation
            templateName: "staff_verification",
          },
        }
      );

      if (error) throw error;

      if (!responseData?.success) {
        throw new Error(
          responseData?.message || "Failed to resend verification code"
        );
      }

      // Clear error state as we're giving another attempt
      setError(null);
      setVerificationCode("");
      toast.success("New verification code sent to " + tempEmployeeData.phone);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification code");
      console.error("Error resending OTP:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to form step
  const handleBackToForm = () => {
    setVerificationStep("form");
    setVerificationCode("");
    setError(null);
  };

  // Handle error display
  if (error && open) {
    toast.error(`There was an error: ${error.message}`);
  }
  
  // Use effect to prevent scrolling of background content when dialog is open
  useEffect(() => {
    if (open) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent background scrolling when dialog is open
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${scrollY}px`;

      return () => {
        // Re-enable scrolling when dialog closes
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.top = "";
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`!top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[98vw] max-w-none border shadow-xl rounded-t-2xl !rounded-b-none overflow-hidden flex flex-col
          ${isMobile 
            ? 'h-[95vh] pt-[0.5%] px-[1.5%]' 
            : 'h-[98vh] pt-[3%] pl-[10%] pr-[10%]'
          }`}
      >
        {verificationStep === "form" && (
          <div className="flex justify-end mt-0 mb-0 mr-0 gap-3 absolute top-2 right-2 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className={`whitespace-nowrap ${isMobile ? 'p-1.5 h-auto w-auto border-none shadow-none bg-transparent hover:bg-transparent' : ''}`}
              form="staff-form"
            >
              {isMobile ? <X size={20} strokeWidth={2.5} className="text-gray-600" /> : "Close"}
            </Button>
            {!isMobile && (
              <Button
                type="submit"
                disabled={isLoading}
                className="whitespace-nowrap"
                form="staff-form"
              >
                {isLoading && (
                  <LoaderCircle
                    className="animate-spin mr-2"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
                {employeeId ? "Update" : "Add"}
              </Button>
            )}
          </div>
        )}
        
        <DialogHeader className={`flex justify-between items-start ${isMobile ? 'text-left mt-3' : ''}`}>
          <div className={isMobile ? 'w-full text-left' : ''}>
            <DialogTitle className={`!text-[1.75rem] font-semibold ${isMobile ? 'text-left' : ''}`}>
              {employeeId
                ? "Edit Staff Member"
                : verificationStep === "otp"
                ? "Verify Staff Member"
                : verificationStep === "done"
                ? "Staff Member Created"
                : "Add Staff Member"}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        {/* Sticky footer for mobile */}
        {isMobile && verificationStep === "form" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 flex justify-end gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="whitespace-nowrap px-6 flex-1"
              form="staff-form"
            >
              {isLoading && (
                <LoaderCircle
                  className="animate-spin mr-2"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              )}
              {employeeId ? "Update" : "Add"}
            </Button>
          </div>
        )}
        
        {error ? (
          <div className="py-4 text-center">
            <p className="text-destructive">Error: {error.message}</p>
            <button
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
          </div>
        ) : verificationStep === "otp" ? (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6 space-y-2">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium">Verify Phone Number</h3>
              <p className="text-sm text-muted-foreground">
                A verification code has been sent to{" "}
                <span className="font-medium">{tempEmployeeData?.phone}</span>.
                <br />
                Please enter the 6-digit code to verify and create the staff
                account.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-full flex flex-col items-center justify-center my-4">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isLoading}
                  data-input-otp
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {verificationError && (
                  <div className="mt-3 text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>{verificationError}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-center w-full mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToForm}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  type="submit"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="px-6 min-w-[140px]"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      verificationCode.length === 6 &&
                      !isLoading
                    ) {
                      handleVerifyOTP();
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Create"
                  )}
                </Button>
              </div>
              <div className="text-center mt-2">
                {canResendOtp ? (
                  <Button
                    type="button"
                    variant="link"
                    className="text-primary"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                  >
                    Resend verification code
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Resend code in{" "}
                    <span className="font-medium">{resendCountdown}</span>{" "}
                    seconds
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : verificationStep === "done" ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-2xl font-medium mb-2">
              Staff Member Created Successfully!
            </h3>
            <p className="text-base text-muted-foreground">
              The staff account has been verified and is now active.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Closing automatically...
            </p>
          </div>
        ) : (
          <div className={`flex-1 overflow-hidden ${isMobile ? 'pb-20' : ''}`}>
            <StaffNewLayout
              onSubmit={handleFormSubmit}
              onCancel={() => onOpenChange(false)}
              employeeId={employeeId}
              initialData={employeeData}
              isSubmitting={isLoading}
              use2FactorVerification={!employeeId}
              isMobile={isMobile}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
