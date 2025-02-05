import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, Calendar, Package2, Tags } from "lucide-react";

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
          <Calendar className="w-5 h-5" />
          <span>Dashboard</span>
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

        {/* Inventory Section */}
        <div className="pt-2">
          <div className="px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Inventory</span>
          </div>
          <NavLink
            to="/admin/inventory/products"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`
            }
          >
            <Package2 className="w-5 h-5" />
            <span>Products</span>
          </NavLink>
          <NavLink
            to="/admin/inventory/categories"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`
            }
          >
            <Tags className="w-5 h-5" />
            <span>Product Categories</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}