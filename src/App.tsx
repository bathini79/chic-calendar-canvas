import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Categories from "./pages/Categories";
import Auth from "./pages/Auth";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Router>
        <SidebarProvider defaultOpen>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <SidebarRail />
            <SidebarInset className="flex-1 w-full">
              <main className="w-full">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/auth" element={<Auth />} />
                </Routes>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
        <Toaster />
      </Router>
    </SessionContextProvider>
  );
}

export default App;