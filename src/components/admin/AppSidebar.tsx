import React from "react";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Calendar, 
  CircleDollarSign, 
  ClipboardList, 
  Home, 
  Package, 
  Settings, 
  ShoppingBag, 
  Users 
} from "lucide-react";

export function AppSidebar() {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-between">
          <Link to="/admin" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-8 w-auto" 
            />
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-1 py-2">
          <SidebarItem href="/admin" icon={Home} text="Dashboard" />
          <SidebarItem href="/admin/bookings" icon={Calendar} text="Bookings" />
          <SidebarItem href="/admin/customers" icon={Users} text="Customers" />
          <SidebarItem href="/admin/services" icon={ClipboardList} text="Services" />
          <SidebarItem href="/admin/products" icon={Package} text="Products" />
          <SidebarItem href="/admin/inventory" icon={ShoppingBag} text="Inventory" />
          <SidebarItem href="/admin/sales" icon={CircleDollarSign} text="Sales" />
          <SidebarItem href="/admin/reports" icon={BarChart3} text="Reports" />
          <SidebarItem href="/admin/settings" icon={Settings} text="Settings" />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 text-xs text-muted-foreground">
          <p>© 2023 Salon Management</p>
          <p>Version 1.0.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarItem({ href, icon: Icon, text, className }) {
  const isActive = window.location.pathname === href || 
                  (href !== '/admin' && window.location.pathname.startsWith(href));
  
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </Link>
  );
}
