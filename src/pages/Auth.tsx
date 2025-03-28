
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Country codes for phone numbers
const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
];

// Lead source options
const leadSourceOptions = [
  { value: "google", label: "Google Search" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "friend", label: "Friend/Family" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" },
];

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91"); // Default to India
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [needsFullName, setNeedsFullName] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [edgeFunctionError, setEdgeFunctionError] = useState<string | null>(null);
  const [leadSource, setLeadSource] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    // Check for lead source from URL parameters
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    if (sourceParam && leadSourceOptions.some(opt => opt.value === sourceParam)) {
      setLeadSource(sourceParam);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        navigate("/");
      }
    });

    if (session) {
      navigate("/");
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

      if (error) throw error;

      if (isSignUp) {
        toast.success("Check your email for the confirmation link!");
      } else {
        toast.success("Logged in successfully!");
      }
    } catch (error: any) {
      toast.error(error.message);
      console.error("Authentication error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendWhatsAppOTP = async () => {
    // Validate phone number (should be 10 digits for Indian numbers)
    const phoneRegex = /^\d{10}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      toast.error("Please enter a valid 10-digit phone number");
      setVerificationError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    setVerificationError(null);
    setEdgeFunctionError(null);
    setCanResendOtp(false);
    setResendCountdown(30);
    
    try {
      // Format phone number with country code
      const formattedPhone = `${countryCode}${phoneNumber}`;
      
      const response = await supabase.functions.invoke('send-whatsapp-otp', {
        body: { phoneNumber: formattedPhone },
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
      const errorMessage = error.message || "Failed to send OTP";
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
      toast.error("Please enter a valid 6-digit OTP");
      setVerificationError("Please enter a valid 6-digit OTP");
      return;
    }

    if (needsFullName && !fullName.trim()) {
      toast.error("Full name is required for new registrations");
      setVerificationError("Full name is required for new registrations");
      return;
    }

    setIsLoading(true);
    setVerificationError(null);
    setEdgeFunctionError(null);
    
    try {
      // Format phone number with country code
      const formattedPhone = `${countryCode}${phoneNumber}`;
      
      const response = await supabase.functions.invoke('verify-whatsapp-otp', {
        body: { 
          phoneNumber: formattedPhone, 
          code: otp,
          fullName: needsFullName ? fullName : undefined,
          leadSource: leadSource
        },
      });

      if (response.data && response.data.error) {
        if (response.data.error === "new_user_requires_name") {
          setNeedsFullName(true);
          setVerificationError("Please enter your full name to complete registration");
          setEdgeFunctionError("New user registration requires a full name");
          toast.info("New user detected. Please enter your full name to complete registration.");
          setIsLoading(false);
          return;
        }
        setVerificationError(response.data.message || "Verification failed");
        setEdgeFunctionError(response.data.error);
        toast.error(response.data.message || "Verification failed");
        setIsLoading(false);
        return;
      }

      toast.success(response.data.isNewUser ? 
        "Registration successful! Logging in..." : 
        "Login successful!");
      
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const errorMessage = "Connection error. Please try again.";
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

  const renderPhoneContent = () => {
    if (!otpSent) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <div className="flex">
              <Select
                value={countryCode}
                onValueChange={setCountryCode}
              >
                <SelectTrigger className="w-[140px] rounded-r-none">
                  <SelectValue placeholder="Code" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectGroup>
                    <SelectLabel>Countries</SelectLabel>
                    {countryCodes.map((country) => (
                      <SelectItem key={`${country.code}-${country.country}`} value={country.code}>
                        <span className="flex items-center">
                          <span className="mr-2">{country.flag}</span>
                          <span>{country.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                className="rounded-l-none"
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => {
                  // Only allow digits, max 10 characters
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(value);
                }}
                required
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="leadSource" className="text-sm font-medium">
                How did you hear about us?
              </Label>
              <Select
                value={leadSource || ""}
                onValueChange={setLeadSource}
              >
                <SelectTrigger className="w-full" id="leadSource">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {leadSourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          {verificationError && (
            <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
          {edgeFunctionError && (
            <div className="bg-yellow-50 text-yellow-800 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Server Error:</strong> {edgeFunctionError}
              </span>
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
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Please enter your full name to complete registration
            </p>
          </div>
          {verificationError && (
            <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
          {edgeFunctionError && (
            <div className="bg-yellow-50 text-yellow-800 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Server Error:</strong> {edgeFunctionError}
              </span>
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
          <Label htmlFor="otp" className="text-sm font-medium">
            Enter OTP
          </Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
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
          {edgeFunctionError && (
            <div className="bg-yellow-50 text-yellow-800 p-2 rounded-md text-sm flex items-start mt-2">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Server Error:</strong> {edgeFunctionError}
              </span>
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
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "email" | "phone")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">WhatsApp</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email">
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="phone">
            <CardContent>
              <div className="space-y-4">
                {renderPhoneContent()}
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
        
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
