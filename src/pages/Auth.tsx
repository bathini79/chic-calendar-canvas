import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const referralSources = [
  { value: "google", label: "Google Search" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "friend", label: "Friend or Family" },
  { value: "existing_customer", label: "I'm an Existing Customer" },
  { value: "walk_by", label: "Walk By" },
  { value: "other", label: "Other" },
];

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const referralSourceParam = queryParams.get('referral');

  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [needsFullName, setNeedsFullName] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [edgeFunctionError, setEdgeFunctionError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState({ name: "India", code: "+91", flag: "🇮🇳" });
  const [referralSource, setReferralSource] = useState(referralSourceParam || "");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        navigate("/services");
      }
    });

    if (session) {
      navigate("/services");
    }

    return () => subscription.unsubscribe();
  }, [navigate, session]);

  useEffect(() => {
    let timer: number | undefined;
    
    if (otpSent && resendCountdown > 0) {
      timer = window.setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    
    if (resendCountdown === 0) {
      setCanResendOtp(true);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [otpSent, resendCountdown]);

  useEffect(() => {
    if (referralSourceParam && referralSources.some(source => source.value === referralSourceParam)) {
      setReferralSource(referralSourceParam);
    }
  }, [referralSourceParam]);

  const handleCountryChange = (country: {name: string, code: string, flag: string}) => {
    setSelectedCountry(country);
  };

  const sendWhatsAppOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      const errorMessage = "Please enter a valid phone number";
      toast.error(errorMessage);
      setVerificationError(errorMessage);
      return;
    }

    setIsLoading(true);
    setVerificationError(null);
    setEdgeFunctionError(null);
    setCanResendOtp(false);
    setResendCountdown(30);
    
    try {
      const fullPhoneNumber = phoneNumber.startsWith('+') ? 
        phoneNumber : 
        `${selectedCountry.code.slice(1)}${phoneNumber.replace(/\s/g, '')}`;
      
      console.log("Sending OTP to phone number:", fullPhoneNumber);
      
      const response = await supabase.functions.invoke('customer-send-whatsapp-otp', {
        body: { 
          phoneNumber: fullPhoneNumber,
          fullName: fullName || undefined,
          lead_source: referralSource || undefined,
          baseUrl: window.location.origin
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send OTP");
      }
      
      if (response.data && response.data.error) {
        throw new Error(response.data.error || "Failed to send OTP");
      }

      setOtpSent(true);
      setNeedsFullName(false);
      toast.success("OTP sent to your WhatsApp. Please check your messages.");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send OTP. Please try again.";
      toast.error(errorMessage);
      setVerificationError(errorMessage);
      setEdgeFunctionError(errorMessage);
      console.error("OTP send error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWhatsAppOTP = async () => {
    if (!otp || otp.length !== 6) {
      const errorMessage = "Please enter a valid 6-digit OTP";
      toast.error(errorMessage);
      setVerificationError(errorMessage);
      return;
    }

    if (needsFullName && !fullName.trim()) {
      const errorMessage = "Full name is required for new registrations";
      toast.error(errorMessage);
      setVerificationError(errorMessage);
      return;
    }

    setIsLoading(true);
    setVerificationError(null);
    setEdgeFunctionError(null);
    
    try {
      const fullPhoneNumber = phoneNumber.startsWith('+') ? 
        phoneNumber : 
        `${selectedCountry.code.slice(1)}${phoneNumber.replace(/\s/g, '')}`;
      
      console.log("Verifying OTP for phone number:", fullPhoneNumber);
      
      const response = await supabase.functions.invoke('customer-verify-whatsapp-otp', {
        body: { 
          phoneNumber: fullPhoneNumber, 
          code: otp,
          fullName: needsFullName ? fullName : undefined,
          lead_source: referralSource || undefined
        },
      });
      
      if (response.data && response.data.error) {
        if (response.data.error === "new_user_requires_name") {
          setNeedsFullName(true);
          toast.info("New user detected. Please enter your full name to complete registration.");
          setIsLoading(false);
          return;
        }
        
        if (response.data.error === "user_creation_failed") {
          console.error("User creation failed:", response.data);
          const errorDetails = response.data.details || "Database error";
          setVerificationError(`User registration failed: ${errorDetails}`);
          setEdgeFunctionError(response.data.error);
          toast.error(`Registration failed: ${errorDetails}`);
          setIsLoading(false);
          return;
        }
        
        const errorMessage = response.data.message || "Verification failed. Please try again.";
        toast.error(errorMessage);
        setVerificationError(errorMessage);
        setEdgeFunctionError(response.data.error);
        setIsLoading(false);
        return;
      }

      if (response.data && response.data.credentials) {        
        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: response.data.credentials.email,
            password: response.data.credentials.password,
            options: {
              data: {
                phone: fullPhoneNumber,
                full_name: fullName || response.data.fullName
              }
            }
          });
          
          if (signInError) {
            console.error("Error signing in with credentials:", signInError);
            toast.error("Error signing in: " + signInError.message);
            setIsLoading(false);
            return;
          }
          
          toast.success(response.data.isNewUser ? 
            "Registration successful! Welcome!" : 
            "Login successful!");
            
          if (data.session) {
            navigate("/services");
          }
        } catch (signInError: any) {
          console.error("Error signing in:", signInError);
          toast.error("Error during authentication: " + signInError.message);
        }
      } else {
        console.error("No credentials in response:", response.data);
        toast.error("Authentication response missing credentials");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const errorMessage = error.message || "Connection error. Please try again.";
      toast.error(errorMessage);
      setVerificationError(errorMessage);
      setEdgeFunctionError("Network or server error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtp("");
    setCanResendOtp(false);
    setResendCountdown(30);
    sendWhatsAppOTP();
  };

  const renderContent = () => {
    if (!otpSent) {
      return (
        <>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </label>
            <PhoneInput
              id="phone"
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value)}
              selectedCountry={selectedCountry}
              onCountryChange={handleCountryChange}
              required
            />
          </div>
          {verificationError && (
            <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
          <Button
            type="button"
            className="w-full"
            onClick={sendWhatsAppOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send OTP via WhatsApp"
            )}
          </Button>
        </>
      );
    }

    if (needsFullName) {
      return (
        <>
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="referralSource" className="text-sm font-medium">
              How did you hear about us?
            </label>
            <Select value={referralSource} onValueChange={setReferralSource}>
              <SelectTrigger id="referralSource">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {referralSources.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {verificationError && (
            <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={() => {
                setNeedsFullName(false);
                setOtpSent(false);
                setVerificationError(null);
                setEdgeFunctionError(null);
              }}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              type="button"
              className="w-1/2"
              onClick={verifyWhatsAppOTP}
              disabled={isLoading || !fullName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="space-y-2">
          <label htmlFor="otp" className="text-sm font-medium">
            Enter OTP
          </label>
          <div className="flex justify-center">
          <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
            ><InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Check your WhatsApp for the 6-digit verification code
          </p>
          {verificationError && (
            <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
          <div className="text-center mt-2">
            {canResendOtp ? (
              <Button
                type="button"
                variant="link"
                className="text-primary"
                onClick={handleResendOTP}
                disabled={isLoading}
              >
                Resend OTP
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Resend OTP in {resendCountdown} seconds
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            className="w-1/2"
            onClick={() => {
              setOtpSent(false);
              setOtp("");
              document.querySelectorAll("input[data-otp-slot]").forEach(input => input.value = "");
              setVerificationError(null);
              setEdgeFunctionError(null);
            }}
            disabled={isLoading}
          >
            Back
          </Button>
          <Button
            type="button"
            className="w-1/2"
            onClick={verifyWhatsAppOTP}
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify OTP"
            )}
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Salon App</CardTitle>
          <CardDescription>
            Sign in or register using WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {renderContent()}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4 mt-4">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
