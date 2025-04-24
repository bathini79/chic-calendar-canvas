import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { countryCodes, CountryCode } from "@/lib/country-codes";
import { parsePhoneCountryCode } from "@/enums/CountryCode";

export default function CustomerVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const phone = searchParams.get("phone");
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>(
    countryCodes.find(c => c.name === "India") || countryCodes[0]
  );
  const [verificationCode, setVerificationCode] = useState(code || "");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [autoVerifiedAttempted, setAutoVerifiedAttempted] = useState(false);

  // Parse phone number from URL if present
  useEffect(() => {
    if (phone) {
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
          
    }
  , [code, phone, autoVerifiedAttempted]);

  const handleVerify = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number");
      return;
    }

    if (!verificationCode) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Sending verification request for phone:", phoneNumber, "code:", verificationCode);

      const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", {
        body: {
          code: verificationCode,
          phoneNumber:phone, // Send phone number as is
        },
      });

      if (error) {
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

              // Redirect to home page after successful verification
              setTimeout(() => {
                navigate("/customer/home");
              }, 2000);
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
          <CardTitle className="text-2xl">Customer Verification</CardTitle>
          <CardDescription>
            Verify your number to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={countryCode.code}
                    onValueChange={(value) => {
                      const selected = countryCodes.find(c => c.code === value);
                      if (selected) setCountryCode(selected);
                    }}
                    disabled={true}
                  >
                    <SelectTrigger id="country-code" className="w-32">
                      <SelectValue placeholder="Select country">
                        <span className="flex items-center">
                          <span className="mr-2">{countryCode.flag}</span>
                          <span>{countryCode.code}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center">
                            <span className="mr-2">{country.flag}</span>
                            <span>{country.name} ({country.code})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(value);
                    }}
                    disabled={loading}
                    className="flex-1"
                  />
                </div>
              </div>
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
              disabled={loading || !phoneNumber || !verificationCode}
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
            <Button className="w-full" onClick={() => navigate("/")}>
              Go to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
