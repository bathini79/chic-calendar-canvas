import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Menu,
  Search,
  Home,
  Star,
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  Package,
  Filter,
  Settings,
  Grid3X3,
  List
} from 'lucide-react';

interface MobileReportsNavProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentCategory?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  className?: string;
}

interface ReportCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

const quickActions = [
  { id: 'dashboard', name: 'Dashboard', icon: <Home size={18} />, href: '/admin' },
  { id: 'all-reports', name: 'All Reports', icon: <BarChart3 size={18} /> },
  { id: 'starred', name: 'Starred Reports', icon: <Star size={18} /> },
];

const reportCategories: ReportCategory[] = [
  { id: 'customer', name: 'Customer Analytics', count: 12, icon: <Users size={18} /> },
  { id: 'financial', name: 'Financial Reports', count: 8, icon: <TrendingUp size={18} /> },
  { id: 'operational', name: 'Operations', count: 6, icon: <Calendar size={18} /> },
  { id: 'marketing', name: 'Marketing', count: 4, icon: <Package size={18} /> },
];

export function MobileReportsNav({
  isOpen = false,
  onOpenChange,
  currentCategory = 'all',
  onCategoryChange,
  searchQuery = '',
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  className
}: MobileReportsNavProps) {
  
  const handleCategoryClick = (categoryId: string) => {
    onCategoryChange?.(categoryId);
    onOpenChange?.(false); // Close the sheet after selection
  };

  const handleViewModeToggle = () => {
    onViewModeChange?.(viewMode === 'grid' ? 'list' : 'grid');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("lg:hidden", className)}
        >
          <Menu size={18} />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-left">Reports & Analytics</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h3>
              <div className="space-y-1">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    className="w-full justify-start h-10"
                    onClick={() => {
                      if (action.id !== 'dashboard') {
                        handleCategoryClick(action.id === 'all-reports' ? 'all' : action.id);
                      }
                    }}
                  >
                    <span className="text-muted-foreground mr-3">
                      {action.icon}
                    </span>
                    {action.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Report Categories */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Categories</h3>
              <div className="space-y-1">
                {reportCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={currentCategory === category.id ? "secondary" : "ghost"}
                    className="w-full justify-between h-10"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className="flex items-center">
                      <span className="text-muted-foreground mr-3">
                        {category.icon}
                      </span>
                      {category.name}
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {category.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="mb-6" />

            {/* View Controls */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">View Options</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? "default" : "outline"}
                  size="sm"
                  onClick={() => onViewModeChange?.('grid')}
                  className="flex-1"
                >
                  <Grid3X3 size={16} className="mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? "default" : "outline"}
                  size="sm"
                  onClick={() => onViewModeChange?.('list')}
                  className="flex-1"
                >
                  <List size={16} className="mr-2" />
                  List
                </Button>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
              >
                <Filter size={18} className="text-muted-foreground mr-3" />
                Advanced Filters
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
              >
                <Settings size={18} className="text-muted-foreground mr-3" />
                Report Settings
              </Button>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              Business Intelligence v1.0
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
