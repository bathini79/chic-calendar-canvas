
import React, { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";

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

interface AppSidebarProps {
  open?: boolean;
}

export function AppSidebar({ open }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { setOpen } = useSidebar();
  const isMobile = useIsMobile();
  
  const { data: businessDetails } = useQuery({
    queryKey: ["businessDetails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_details")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const toggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <Sidebar className={cn(
      "border-r transition-all duration-300 ease-in-out",
      open ? "w-[240px]" : "w-[60px]",
    )}>
      <div className={cn(
        "flex h-14 items-center px-6 border-b",
        !open && "justify-center px-0"
      )}>
        <Link to="/admin" className="flex items-center overflow-hidden">
          {businessDetails?.logo_url ? (
            <img 
              src={businessDetails.logo_url} 
              alt="Business Logo" 
              className="h-6 w-6 object-contain" 
            />
          ) : (
            <CreditCard className="h-6 w-6" />
          )}
          {open && (
            <span className="ml-2 text-lg font-semibold truncate">
              {businessDetails?.name || "Beauty SaaS"}
            </span>
          )}
        </Link>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className={cn(
            "ml-auto",
            !open && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {!open && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="ml-auto absolute -right-3 top-5 bg-background border rounded-full h-6 w-6 flex items-center justify-center"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <SidebarContent>
        <ScrollArea className="flex-1">
          <nav className="grid items-start px-2 py-4">
            {sidebarNavItems.map((item, index) => (
              <Link to={item.href} key={index}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start", 
                    pathname === item.href && "bg-muted",
                    !open && "justify-center",
                  )}
                >
                  {item.icon}
                  {open && <span>{item.title}</span>}
                </Button>
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
