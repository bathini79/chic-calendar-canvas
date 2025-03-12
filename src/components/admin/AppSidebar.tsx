
import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, Calendar, Package2, Home, Settings, DollarSign } from "lucide-react";

export function AppSidebar() {
  return (
    <aside className="w-64 bg-background border-r min-h-screen p-4">
      <nav className="space-y-2">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/admin/bookings"
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
          to="/admin/services"
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
          to="/admin/staff"
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
          to="/admin/inventory"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <Package2 className="w-5 h-5" />
          <span>Inventory</span>
        </NavLink>
        <NavLink
          to="/admin/sales"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <DollarSign className="w-5 h-5" />
          <span>Sales</span>
        </NavLink>
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
}
