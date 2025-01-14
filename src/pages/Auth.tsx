import { useEffect, useState } from "react";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthError } from "@supabase/supabase-js";

const Auth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/");
      }
      
      if (event === 'USER_UPDATED') {
        setError(null);
      }
    });

    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      authListener.data.subscription.unsubscribe();
    };
  }, [navigate]);

  const getErrorMessage = (error: string) => {
    try {
      const errorObj = JSON.parse(error);
      switch (errorObj.code) {
        case 'user_already_exists':
          return 'This email is already registered. Please sign in instead.';
        case 'invalid_credentials':
          return 'Invalid email or password. Please check your credentials.';
        default:
          return errorObj.message || 'An error occurred during authentication.';
      }
    } catch {
      return error;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please sign in with Google to continue
          </p>
        </div>
        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-md rounded-lg space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#000000',
                    brandAccent: '#333333',
                  },
                },
              },
            }}
            providers={["google"]}
            onError={(err: AuthError) => {
              if (err.message.includes('422')) {
                try {
                  setError(getErrorMessage(err.message));
                } catch {
                  setError(err.message);
                }
              } else {
                setError(err.message);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;