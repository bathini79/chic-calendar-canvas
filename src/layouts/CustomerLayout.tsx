import { Outlet } from "react-router-dom";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";

export function CustomerLayout() {
  return (
    <div className="min-h-screen">
      <CustomerNavbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}