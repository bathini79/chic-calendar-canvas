import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "@/pages/Index";
import Services from "@/pages/Services";
import Staff from "@/pages/Staff";
import Book from "@/pages/Book";
import BookingForm from "@/components/BookingForm";

function App() {
  return (
    <Router>
      <div className="flex">
        <AppSidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/book" element={<Book />} />
            <Route path="/book/service/:id" element={<BookingForm />} />
            <Route path="/book/package/:id" element={<BookingForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
