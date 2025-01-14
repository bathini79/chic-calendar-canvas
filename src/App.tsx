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
  isAuthenticated: boolean;
  userRole: string | null;
  isLoading: boolean;
}

const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
    isLoading: true
  });

  useEffect(() => {
    const checkSession = async () => {
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
        console.error('Auth check error:', error);
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          isLoading: false
        });
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return authState;
};

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

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
                isAuthenticated ? (
                  <Navigate to={userRole === 'admin' ? '/admin' : '/customer'} replace />
                ) : (
                  <Login />
                )
              } 
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedRoute allowedRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Navigate to={userRole === 'admin' ? '/admin' : '/customer'} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
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