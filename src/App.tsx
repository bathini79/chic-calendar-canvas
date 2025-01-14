import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/CustomerDashboard";

const queryClient = new QueryClient();

interface AuthState {
  isAuthenticated: boolean | null;
  userRole: string | null;
  isLoading: boolean;
}

const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: null,
    userRole: null,
    isLoading: true
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setAuthState({
            isAuthenticated: true,
            userRole: profile?.role || null,
            isLoading: false
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            userRole: null,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          isLoading: false
        });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setAuthState({
          isAuthenticated: true,
          userRole: profile?.role || null,
          isLoading: false
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          isLoading: false
        });
      }
    });

    checkAuth();
    return () => subscription.unsubscribe();
  }, []);

  return authState;
};

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || userRole !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const ProtectedCustomerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/customer" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <Index />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedCustomerRoute>
                  <CustomerDashboard />
                </ProtectedCustomerRoute>
              }
            />
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;