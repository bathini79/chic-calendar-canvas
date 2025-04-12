
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { parsePhoneCountryCode } from "@/enums/CountryCode";

export default function VerificationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const phone = searchParams.get("phone");
  
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  // Auto-verify if token was provided
  useEffect(() => {
    if (token && phone) {
      // Don't auto-verify, let the user click the button
      console.log("Verification link detected with token and phone");
    }
  }, [token, phone]);

  const handleVerify = async () => {
    if (!token || !phone) {
      setError("Missing verification information. Please check your link.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", {
        body: {
          phoneNumber: phone,
          token: token
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setVerified(true);
        toast.success("Your account has been verified successfully!");
        
        // If credentials were returned, we could auto-login the user here
        if (data.credentials) {
          try {
            // Optional: Auto-login user after verification
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: data.credentials.email,
              password: data.credentials.password
            });
            
            if (signInError) {
              console.error("Auto-login failed:", signInError);
              // Don't show error to user, the verification was successful
            }
          } catch (loginError) {
            console.error("Auto-login error:", loginError);
            // Don't show error to user, the verification was successful
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
          <CardTitle className="text-2xl">Account Verification</CardTitle>
          <CardDescription>
            Verify your account to activate your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <div className="space-y-4">
              {token && phone ? (
                <div className="bg-blue-50 text-blue-600 p-3 rounded-md flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Verification link detected. Click the button below to verify your account.</span>
                </div>
              ) : (
                <div className="bg-yellow-50 text-yellow-600 p-3 rounded-md flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  <span>Missing verification information. Please check your link.</span>
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
              disabled={loading || (!token || !phone)}
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
            <Button className="w-full" onClick={() => window.location.href = "/"}>
              Go to Homepage
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
