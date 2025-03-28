
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Calendar,
  CreditCard,
  Home,
  Package,
  Settings,
  Scissors,
  Users,
  FileBarChart,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: <Home className="mr-2 h-4 w-4" />,
  },
  {
    title: "Bookings",
    href: "/admin/bookings",
    icon: <Calendar className="mr-2 h-4 w-4" />,
  },
  {
    title: "Services",
    href: "/admin/services",
    icon: <Scissors className="mr-2 h-4 w-4" />,
  },
  {
    title: "Staff",
    href: "/admin/staff",
    icon: <Users className="mr-2 h-4 w-4" />,
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: <Package className="mr-2 h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: <FileBarChart className="mr-2 h-4 w-4" />,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: <Settings className="mr-2 h-4 w-4" />,
  },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { state, setOpen } = useSidebar();
  const isMobile = useIsMobile();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

  return (
    <div className="flex h-screen w-[240px] flex-col border-r">
      <div className="flex h-14 items-center px-6 border-b">
        <Link to="/admin" className="flex items-center">
          <CreditCard className="h-6 w-6" />
          <span className="ml-2 text-lg font-semibold">Beauty SaaS</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="grid items-start px-2 py-4">
          {sidebarNavItems.map((item, index) => (
            <Link to={item.href} key={index}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn("w-full justify-start", {
                  "bg-muted": pathname === item.href,
                })}
              >
                {item.icon}
                {item.title}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
