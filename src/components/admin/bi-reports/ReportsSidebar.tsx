import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  Package,
  Star,
  Filter,
  Search,
  Home,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ReportCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  href?: string;
}

interface ReportsSidebarProps {
  categories: ReportCategory[];
  selectedCategory?: string;
  onCategorySelect: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  starredReports: string[];
  className?: string;
}

const quickActions = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: Home,
  },
  {
    title: "All Reports", 
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Starred Reports",
    href: "/admin/reports/starred",
    icon: Star,
  },
];

export const ReportsSidebar = ({
  categories,
  selectedCategory,
  onCategorySelect,
  searchQuery,
  onSearchChange,
  starredReports,
  className,
}: ReportsSidebarProps) => {
  const location = useLocation();

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-background", className)}>
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="font-semibold">BI Reports</h2>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {/* Quick Actions */}
          <div className="px-3 py-2">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Access
            </h3>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <Link key={action.href} to={action.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      location.pathname === action.href && "bg-muted"
                    )}
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.title}
                    {action.title === "Starred Reports" && starredReports.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {starredReports.length}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Report Categories */}
          <div className="px-3 py-2">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Categories
            </h3>
            <div className="space-y-1">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    selectedCategory === category.id && "bg-muted"
                  )}
                  onClick={() => onCategorySelect(category.id)}
                >
                  <category.icon className="mr-2 h-4 w-4" />
                  {category.title}
                  <Badge variant="outline" className="ml-auto">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="px-3 py-2">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Filters
            </h3>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          Report Settings
        </Button>
      </div>
    </div>
  );
};