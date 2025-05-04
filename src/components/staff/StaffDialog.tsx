import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StaffForm } from "./StaffForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderCircle, ArrowLeft } from "lucide-react";

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function StaffDialog({ open, onOpenChange, employeeId }: StaffDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [verificationStep, setVerificationStep] = useState<'form' | 'otp' | 'done'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [tempEmployeeData, setTempEmployeeData] = useState<any>(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const queryClient = useQueryClient();

  // Reset error state and verification step when dialog opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setVerificationStep('form');
      setVerificationCode('');
      setTempEmployeeData(null);
      setCanResendOtp(false);
      setResendCountdown(0);
    }
  }, [open]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    } else {
      setCanResendOtp(verificationStep === 'otp');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown, verificationStep]);

  // Fetch employee data if editing
  const { data: employeeData } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      try {
        if (!employeeId) return null;

        const { data, error } = await supabase
          .from('employees')
          .select(`
            *,
            employee_skills(service_id),
            employee_locations(location_id)
          `)
          .eq('id', employeeId)
          .single();

        if (error) throw error;
        return data;
      } catch (err: any) {
        console.error("Error fetching employee data:", err);
        setError(err);
        return null;
      }
    },
    enabled: !!employeeId && open
  });

  const handleFormSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      // If editing existing employee
      if (employeeId) {
        const { error } = await supabase
          .from("employees")
          .update({
            name: data.name,
            email: data.email || `${data.phone.replace(/\D/g, '')}@staff.internal`, // Ensure email is never null
            phone: data.phone,
            photo_url: data.photo_url,
            status: data.status,
            employment_type_id: data.employment_type_id,
          })
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

        toast.success("Staff member updated successfully");
        // Invalidate all queries related to employees to ensure complete refresh
        queryClient.invalidateQueries({ queryKey: ["employees-with-locations"] });
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

        // Store form data for later use
        setTempEmployeeData(data);

        // Call the employee-onboarding edge function to create temporary employee record and send OTP
        const { data: responseData, error } = await supabase.functions.invoke('employee-onboarding', {
          body: {
            employeeData: {
              ...data,
              status: 'inactive', // Always set to inactive for new employees
              baseUrl
            },
            sendWelcomeMessage: false,
            createAuthAccount: false,
            sendVerificationLink: false,
            sendOtp: true, // Request an OTP generation
            templateName: 'staff_verification' // Add template name for 2Factor
          }
        });

        if (error) throw error;

        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to create temporary employee record");
        }

        // Move to OTP verification step
        setVerificationStep('otp');
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
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-employee-code', {
        body: {
          phoneNumber: tempEmployeeData.phone,
          code: verificationCode,
        }
      });

      if (verifyError) {
        throw verifyError;
      }

      if (!verifyData?.success) {
        // For any verification error, just show the error message in toast 
        // but keep the dialog open for retry
        toast.error(verifyData?.message || "Invalid verification code");
        setVerificationCode(''); // Clear the verification code for retry
        setIsLoading(false);
        return; // Return early without closing the dialog
      }

      // OTP verified, complete employee creation
      const baseUrl = window.location.origin;

      const { data: completeData, error: completeError } = await supabase.functions.invoke('employee-onboarding', {
        body: {
          employeeData: {
            ...tempEmployeeData,
            id: verifyData.employeeId,
            status: 'active', // Set to active since it's verified
            baseUrl
          },
          sendWelcomeMessage: true,
          createAuthAccount: true,
          sendVerificationLink: false
        }
      });

      if (completeError) {
        throw completeError;
      }

      if (!completeData?.success) {
        throw new Error(completeData?.message || "Failed to complete staff creation");
      }

      toast.success("Staff member verified and created successfully!");
      // Invalidate the employees query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["employees-with-locations"] });
      setVerificationStep('done');

      // Close dialog after a short delay to show success state
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (error: any) {
      // For any errors related to OTP verification, keep dialog open
      const isOtpValidationError = error.message?.toLowerCase().includes('verification') || 
                                  error.message?.toLowerCase().includes('code') ||
                                  error.message?.toLowerCase().includes('invalid') ||
                                  error.message?.toLowerCase().includes('otp');
      
      if (isOtpValidationError) {
        // For OTP validation errors, show toast but keep dialog open
        toast.error(error.message || "Invalid verification code");
        setVerificationCode(''); // Clear the code field for retry
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
      const { data: responseData, error } = await supabase.functions.invoke('employee-onboarding', {
        body: {
          employeeData: {
            ...tempEmployeeData,
            baseUrl
          },
          sendWelcomeMessage: false,
          createAuthAccount: false,
          sendVerificationLink: false,
          sendOtp: true, // Request an OTP generation
          templateName: 'staff_verification'
        }
      });

      if (error) throw error;

      if (!responseData?.success) {
        throw new Error(responseData?.message || "Failed to resend verification code");
      }

      // Clear error state as we're giving another attempt
      setError(null);
      setVerificationCode('');
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
    setVerificationStep('form');
    setVerificationCode('');
    setError(null);
  };

  // Handle error display
  if (error && open) {
    toast.error(`There was an error: ${error.message}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employeeId ? "Edit Staff Member" :
              verificationStep === 'otp' ? "Verify Staff Member" :
                verificationStep === 'done' ? "Staff Member Created" :
                  "Add Staff Member"}
          </DialogTitle>
          <DialogDescription>
            {employeeId ? "Update the information for this staff member." :
              verificationStep === 'otp' ? "Enter the verification code sent to the staff member's phone." :
                verificationStep === 'done' ? "Staff member has been successfully created and verified!" :
                  "Fill in the details to add a new staff member to your team."}
          </DialogDescription>
        </DialogHeader>

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
        ) : verificationStep === 'otp' ? (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              A verification code has been sent to {tempEmployeeData?.phone}.
              Please enter the 6-digit code below to verify and create the staff account.
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <Input
                className="text-center text-lg w-full max-w-[200px]"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                placeholder="000000"
                disabled={isLoading}
                maxLength={6}
                inputMode="numeric"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBackToForm}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  onClick={handleVerifyOTP}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : "Verify & Create"}
                </Button>
              </div>

              {canResendOtp ? (
                <Button
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                >
                  Resend OTP
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Resend OTP in {resendCountdown}s
                </p>
              )}
            </div>
          </div>
        ) : verificationStep === 'done' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Staff Member Created Successfully!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The staff account has been verified and is now active.
            </p>
          </div>
        ) : (
          <StaffForm
            onSubmit={handleFormSubmit}
            onCancel={() => onOpenChange(false)}
            employeeId={employeeId}
            initialData={employeeData}
            isSubmitting={isLoading}
            use2FactorVerification={!employeeId} // Use 2Factor verification for new staff only
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
