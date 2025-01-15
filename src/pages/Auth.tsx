import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleError = (error: Error) => {
    setErrorMessage(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-md space-y-6 p-8">
        <h1 className="text-3xl font-bold text-center text-foreground">Welcome Back</h1>
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="border rounded-lg p-6 bg-card shadow-sm">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'black',
                    brandAccent: '#333',
                    brandButtonText: 'white',
                    defaultButtonBackground: 'white',
                    defaultButtonBackgroundHover: '#f4f4f4',
                    defaultButtonBorder: 'lightgray',
                    defaultButtonText: 'black',
                    dividerBackground: '#e6e6e6',
                    inputBackground: 'white',
                    inputBorder: 'lightgray',
                    inputBorderHover: 'gray',
                    inputBorderFocus: 'black',
                    inputText: 'black',
                    inputLabelText: 'gray',
                  },
                }
              },
              style: {
                button: {
                  borderRadius: '6px',
                  padding: '10px 15px',
                  transition: 'all 0.2s ease',
                },
                input: {
                  borderRadius: '6px',
                  padding: '10px 15px',
                },
                anchor: {
                  color: 'black',
                  textDecoration: 'none',
                },
                message: {
                  color: 'gray',
                },
              },
            }}
            providers={[]}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;