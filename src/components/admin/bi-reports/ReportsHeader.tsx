import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Star,
  Grid3X3,
  List,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface ReportsHeaderProps {
  currentCategory?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  starredCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

interface ReportCategory {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

const reportCategories: ReportCategory[] = [
  { id: 'all', label: 'All Reports', icon: <Grid3X3 size={16} /> },
  { id: 'customer', label: 'Customer Analytics', count: 12, icon: <TrendingUp size={16} /> },
  { id: 'financial', label: 'Financial Reports', count: 8, icon: <Calendar size={16} /> },
  { id: 'operational', label: 'Operations', count: 6, icon: <Settings size={16} /> },
  { id: 'marketing', label: 'Marketing', count: 4, icon: <Star size={16} /> },
];

export function ReportsHeader({
  currentCategory = 'all',
  onCategoryChange,
  searchQuery = '',
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  starredCount = 0,
  onRefresh,
  isRefreshing = false,
  className
}: ReportsHeaderProps) {
  const location = useLocation();

  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [
      { label: 'Admin', href: '/admin' },
      { label: 'Reports', href: '/admin/reports' }
    ];

    // Add category-specific breadcrumb if not 'all'
    if (currentCategory && currentCategory !== 'all') {
      const category = reportCategories.find(cat => cat.id === currentCategory);
      if (category) {
        items.push({ label: category.label, href: `/admin/reports?category=${currentCategory}` });
      }
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem>
                {index === breadcrumbItems.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title and Description */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Business Intelligence</h1>
            {starredCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star size={12} className="fill-current" />
                {starredCount} starred
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Comprehensive business analytics and performance insights
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download size={16} />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Download size={16} className="mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download size={16} className="mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings size={16} className="mr-2" />
                Export Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Settings size={16} className="mr-2" />
                Report Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar size={16} className="mr-2" />
                Schedule Reports
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Star size={16} className="mr-2" />
                Manage Favorites
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={currentCategory} onValueChange={onCategoryChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:flex lg:w-auto lg:h-auto lg:bg-transparent lg:p-0 lg:gap-1">
          {reportCategories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:px-4 lg:py-2"
            >
              {category.icon}
              <span className="hidden sm:inline">{category.label}</span>
              <span className="sm:hidden">{category.label.split(' ')[0]}</span>
              {category.count && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-5 min-w-5 text-xs lg:data-[state=active]:bg-primary-foreground/20 lg:data-[state=active]:text-primary-foreground"
                >
                  {category.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 pr-4"
          />
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filters</span>
          </Button>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange?.('grid')}
              className="rounded-r-none border-r"
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange?.('list')}
              className="rounded-l-none"
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}