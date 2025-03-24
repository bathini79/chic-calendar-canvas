
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
import { PhoneInput } from "@/components/ui/phone-input";
import { AlertCircle, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [needsFullName, setNeedsFullName] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [edgeFunctionError, setEdgeFunctionError] = useState<string | null>(null);

  // Check if user is already logged in
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // Invalidate and refetch session data
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        navigate("/");
      }
    });

    // Redirect if already logged in
    if (session) {
      navigate("/");
    }

    return () => subscription.unsubscribe();
  }, [navigate, session]);

  // Handle OTP resend countdown
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
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      setVerificationError("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    setVerificationError(null);
    setEdgeFunctionError(null);
    setCanResendOtp(false);
    setResendCountdown(30);
    
    try {
      const response = await supabase.functions.invoke('send-whatsapp-otp', {
        body: { phoneNumber },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send OTP");
      }
      
      if (response.data && response.data.error) {
        throw new Error(response.data.error || "Failed to send OTP");
      }

      setOtpSent(true);
      setNeedsFullName(false); // Reset in case it was previously set
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
      const response = await supabase.functions.invoke('verify-whatsapp-otp', {
        body: { 
          phoneNumber, 
          code: otp,
          fullName: needsFullName ? fullName : undefined
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to verify OTP");
      }
      
      if (response.data && response.data.error) {
        // Handle special case for new users requiring name
        if (response.data.error === "new_user_requires_name") {
          setNeedsFullName(true);
          setIsLoading(false);
          return;
        }
        throw new Error(response.data.error || "Failed to verify OTP");
      }

      toast.success(response.data.isNewUser ? 
        "Registration successful! Logging in..." : 
        "Login successful!");
      
      // Force refresh the session
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to verify OTP";
      toast.error(errorMessage);
      setVerificationError(errorMessage);
      setEdgeFunctionError(errorMessage);
      console.error("OTP verification error:", error);
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
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </label>
            <PhoneInput
              id="phone"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter your phone number with country code (e.g., +1 for US)
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
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={() => {
                setNeedsFullName(false);
                setOtpSent(false);
                setVerificationError(null);
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
              render={({ slots }) => (
                <InputOTPGroup>
                  {slots.map((slot, index) => (
                    <InputOTPSlot
                      key={index}
                      {...slot}
                      index={index}
                      className="w-12 h-14 text-center"
                    />
                  ))}
                </InputOTPGroup>
              )}
            />
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
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
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
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
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
