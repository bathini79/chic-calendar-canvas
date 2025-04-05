
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerificationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const code = searchParams.get("code");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState(code || "");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If token and code are provided in URL, auto-verify
    if (token && code && phoneNumber) {
      handleVerify();
    }
  }, [token, code, phoneNumber]);

  const handleVerify = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number");
      return;
    }

    if (!verificationCode && !token) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-employee-code", {
        body: {
          code: verificationCode,
          phoneNumber,
          token
        }
      });

      if (error) throw error;

      if (data.success) {
        setVerified(true);
        toast.success("Your account has been verified successfully!");
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
          <CardTitle className="text-2xl">Employee Verification</CardTitle>
          <CardDescription>
            Verify your account to activate your staff profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Your Phone Number
                </label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Enter the phone number associated with your staff account
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="code"
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={loading || !!token}
                />
                <p className="text-xs text-slate-500">
                  Enter the 6-digit code sent to your WhatsApp
                </p>
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
                Your staff account has been activated successfully.
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
            <Button className="w-full" onClick={() => window.location.href = "/"}>
              Go to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
