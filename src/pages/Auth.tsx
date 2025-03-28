
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import CountryCodeDropdown from "@/components/ui/country-code-dropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [needsFullName, setNeedsFullName] = useState(false);
  const [countryCode, setCountryCode] = useState<{ name: string; code: string; flag: string }>({ 
    name: "India", 
    code: "+91", 
    flag: "🇮🇳" 
  });
  const [leadSource, setLeadSource] = useState("");

  useEffect(() => {
    // Extract lead source from URL params if available
    const params = new URLSearchParams(location.search);
    const source = params.get("source");
    if (source) {
      setLeadSource(source);
    }
  }, [location]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const formattedPhone = `${countryCode.code}${phoneNumber}`;
      
      // Check if the user exists
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone_number", formattedPhone)
        .maybeSingle();
      
      // If user doesn't exist, set needsFullName to true
      if (!profileData) {
        setNeedsFullName(true);
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      toast({
        title: "OTP sent successfully",
        description: `We've sent a verification code to ${formattedPhone}`,
      });
      
      setStep("otp");
    } catch (error: any) {
      toast({
        title: "Error sending OTP",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const formattedPhone = `${countryCode.code}${phoneNumber}`;
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      // If this is a new user, update their profile with full name and lead source
      if (needsFullName && data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            full_name: fullName,
            lead_source: leadSource || null
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      toast({
        title: "Authentication successful",
        description: "You have been successfully authenticated",
      });
      
      navigate("/services");
    } catch (error: any) {
      toast({
        title: "Error verifying OTP",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background">
      <Card className="w-full max-w-md">
        {step === "phone" ? (
          <>
            <CardHeader>
              <CardTitle className="text-center">Sign in with WhatsApp</CardTitle>
              <CardDescription className="text-center">
                Use your phone number to sign in or create an account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="w-[120px]">
                      <CountryCodeDropdown
                        value={countryCode}
                        onChange={setCountryCode}
                        className="w-full"
                      />
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Allow only numbers and limit to 10 digits
                        const input = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhoneNumber(input);
                      }}
                      placeholder="9876543210"
                      className="flex-1"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>

                {needsFullName && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="leadSource">How did you hear about us?</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger id="leadSource">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="friend">Friend Referral</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending OTP..." : "Continue with WhatsApp"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-center">Verify OTP</CardTitle>
              <CardDescription className="text-center">
                Enter the 6-digit code sent to {countryCode.code}{phoneNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="flex justify-center mb-4">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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

                {needsFullName && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify"}
                </Button>
                
                <Button 
                  type="button"
                  variant="link" 
                  onClick={() => setStep("phone")} 
                  className="w-full"
                  disabled={loading}
                >
                  Back to Phone Entry
                </Button>
              </form>
            </CardContent>
          </>
        )}
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
