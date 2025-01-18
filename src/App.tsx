import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/AppSidebar";
import Services from "@/pages/Services";
import Staff from "@/pages/Staff";
import Index from "@/pages/Index";

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/services" element={<Services />} />
              <Route path="/staff" element={<Staff />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </QueryClientProvider>
    </Router>
  );
}

export default App;