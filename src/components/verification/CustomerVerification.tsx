
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { parsePhoneCountryCode } from "@/lib/country-codes";

export default function CustomerVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const code = searchParams.get("code");
  const phone = searchParams.get("phone");
  
  const [phoneNumber, setPhoneNumber] = useState(phone || "");
  const [countryCode, setCountryCode] = useState({ name: "India", code: "+91", flag: "🇮🇳" });
  const [verificationCode, setVerificationCode] = useState(code || "");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [autoVerifiedAttempted, setAutoVerifiedAttempted] = useState(false);

  useEffect(() => {
    if (phone) {
      console.log("Phone from URL:", phone);
      // Try to find the country code in the phone number
      const countryCodeObj = parsePhoneCountryCode(phone);
      if (countryCodeObj) {
        setCountryCode({
          name: countryCodeObj.name || "Unknown",
          code: countryCodeObj.code,
          flag: countryCodeObj.flag || "🏳️"
        });
        // Extract the phone number without country code
        const phoneWithoutCode = phone.substring(countryCodeObj.code.length);
        setPhoneNumber(phoneWithoutCode);
      }
    }
    
    // Auto-verify if token or code and phone are provided in URL
    if ((token || code) && phone && !autoVerifiedAttempted) {
      setAutoVerifiedAttempted(true);
      handleVerify();
    }
  }, [token, code, phone, autoVerifiedAttempted]);

  
  const handleCountryChange = (country: {name: string, code: string, flag: string}) => {
    setCountryCode(country);
  };

  const handleVerify = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number");
      return;
    }

    if (!verificationCode && !token) {
      setError("Please enter the verification code or use a verification link");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Format the full phone number with country code
      const formattedPhone = phoneNumber.startsWith('+') ? 
        phoneNumber : 
        `${countryCode.code.slice(1)}${phoneNumber.replace(/\s+/g, '')}`;
      
      console.log("Sending verification request for phone:", formattedPhone, "code:", verificationCode);
      
      const { data, error } = await supabase.functions.invoke("customer-verify-whatsapp-otp", {
        body: {
          code: verificationCode,
          phoneNumber: formattedPhone,
          token
        }
      });

      if (error) {
        console.error("Verification error from function:", error);
        throw error;
      }

      console.log("Verification response:", data);

      if (data.success) {
        setVerified(true);
        toast.success("Your account has been verified successfully!");
        
        if (data.credentials) {
          // Sign in the user with the credentials
          try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: data.credentials.email,
              password: data.credentials.password,
            });
            
            if (signInError) {
              console.error("Auto sign-in error:", signInError);
              toast.error("Verification succeeded, but automatic login failed. Please login manually.");
            } else {
              toast.success("You have been automatically logged in!");
              setTimeout(() => {
                navigate("/services");
              }, 1500);
            }
          } catch (signInErr) {
            console.error("Sign-in error:", signInErr);
          }
        }
      } else {
        setError(data.message || "Verification failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "An error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verification</CardTitle>
          <CardDescription>
            Verify your account to activate your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Your Phone Number
                </label>
                <PhoneInput
                  id="phone"
                  value={phoneNumber}
                  onChange={(value) => setPhoneNumber(value)}
                  selectedCountry={countryCode}
                  onCountryChange={handleCountryChange}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Enter the phone number associated with your account
                </p>
              </div>

              {!token && (
                <div className="space-y-2">
                  <label htmlFor="code" className="text-sm font-medium">
                    Verification Code
                  </label>
                  <Input
                    id="code"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Enter the 6-digit code sent to your WhatsApp
                  </p>
                </div>
              )}

              {token && (
                <div className="bg-blue-50 text-blue-600 p-3 rounded-md flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Verification link detected. Click the button below to verify your account.</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold">Verification Successful!</h3>
              <p className="text-slate-600 mt-2">
                Your account has been activated successfully.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {!verified ? (
            <Button
              onClick={handleVerify}
              disabled={loading || (!phoneNumber || (!verificationCode && !token))}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                "Verify Account"
              )}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => navigate("/services")}>
              Go to Services
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
