import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, Calendar, Settings } from "lucide-react";

export function AppSidebar() {
  return (
    <aside className="w-64 bg-background border-r min-h-screen p-4">
      <nav className="space-y-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <Calendar className="w-5 h-5" />
          <span>Bookings</span>
        </NavLink>
        <NavLink
          to="/services"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <LayoutGrid className="w-5 h-5" />
          <span>Services</span>
        </NavLink>
        <NavLink
          to="/staff"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span>Staff</span>
        </NavLink>
        <NavLink
          to="/manage"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span>Manage</span>
        </NavLink>
      </nav>
    </aside>
  );
}