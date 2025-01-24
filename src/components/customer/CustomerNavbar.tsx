import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserStatus } from "@/components/auth/UserStatus";

export function CustomerNavbar() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <NavLink to="/" className="text-xl font-bold">
              Salon
            </NavLink>
            <NavLink
              to="/services"
              className={({ isActive }) =>
                `transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              Services
            </NavLink>
          </div>
          <div className="flex items-center space-x-4">
            <UserStatus />
            <Button variant="outline" asChild>
              <NavLink to="/admin">Admin Panel</NavLink>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}