
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");

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
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('send-whatsapp-otp', {
        body: { phoneNumber },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send OTP");
      }

      setOtpSent(true);
      toast.success("OTP sent to your WhatsApp. Please check your messages.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
      console.error("OTP send error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWhatsAppOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('verify-whatsapp-otp', {
        body: { phoneNumber, code: otp },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to verify OTP");
      }

      toast.success("Phone verified successfully! Logging in...");
      
      // Force refresh the session
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify OTP");
      console.error("OTP verification error:", error);
    } finally {
      setIsLoading(false);
    }
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
                  {isLoading
                    ? "Loading..."
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
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
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your phone number with country code (e.g., +1 for US)
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={sendWhatsAppOTP}
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send OTP via WhatsApp"}
                    </Button>
                  </>
                ) : (
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
                                  className="w-10 h-12 text-center"
                                />
                              ))}
                            </InputOTPGroup>
                          )}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Check your WhatsApp for the 6-digit verification code
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/2"
                        onClick={() => setOtpSent(false)}
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
                        {isLoading ? "Verifying..." : "Verify OTP"}
                      </Button>
                    </div>
                  </>
                )}
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
