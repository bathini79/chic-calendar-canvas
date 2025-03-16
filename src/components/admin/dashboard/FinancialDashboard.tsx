
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, LineChart, BarChart, PieChart, TrendingUp, CreditCard, Calendar, Edit, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import RevenueChart from './RevenueChart';
import TopServicesChart from './TopServicesChart';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyRevenue } from '@/components/admin/reports/DailyRevenue';

type DashboardConfig = {
  id: string;
  name: string;
  description: string | null;
  is_favorite: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
};

type DashboardWidget = {
  id: string;
  dashboard_id: string;
  widget_type: string;
  title: string;
  position: number;
  size: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [isAddWidgetDialogOpen, setIsAddWidgetDialogOpen] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState('revenue-chart');
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const [newWidgetSize, setNewWidgetSize] = useState('medium');
  
  // Get the current user ID from Supabase session
  const [userId, setUserId] = useState<string | null>(null);
  
  // Initialize user ID on component mount
  React.useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    };
    getUserId();
  }, []);

  // Fetch dashboard configurations
  const { data: dashboards, isLoading: isDashboardsLoading, refetch: refetchDashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DashboardConfig[];
    }
  });

  // Fetch widgets for the selected dashboard
  const { data: widgets, isLoading: isWidgetsLoading, refetch: refetchWidgets } = useQuery({
    queryKey: ['dashboard-widgets', selectedDashboard],
    queryFn: async () => {
      if (!selectedDashboard) return [];
      
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', selectedDashboard)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as DashboardWidget[];
    },
    enabled: !!selectedDashboard
  });

  // Fetch locations for filtering
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Create a new dashboard
  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast.error('Dashboard name is required');
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .insert({
          name: newDashboardName,
          description: newDashboardDescription || null,
          is_default: !dashboards || dashboards.length === 0,
          user_id: userId
        })
        .select();

      if (error) throw error;
      
      toast.success('Dashboard created successfully');
      setIsCreateDialogOpen(false);
      setNewDashboardName('');
      setNewDashboardDescription('');
      refetchDashboards();
      
      // Set the newly created dashboard as active
      if (data && data.length > 0) {
        setSelectedDashboard(data[0].id);
        setActiveTab('custom');
      }
    } catch (error) {
      console.error('Error creating dashboard:', error);
      toast.error('Failed to create dashboard');
    }
  };

  // Add a new widget to the dashboard
  const handleAddWidget = async () => {
    if (!selectedDashboard) {
      toast.error('No dashboard selected');
      return;
    }

    if (!newWidgetTitle.trim()) {
      toast.error('Widget title is required');
      return;
    }

    try {
      // Get the next position
      const nextPosition = widgets ? widgets.length : 0;

      const { error } = await supabase
        .from('dashboard_widgets')
        .insert({
          dashboard_id: selectedDashboard,
          widget_type: newWidgetType,
          title: newWidgetTitle,
          position: nextPosition,
          size: newWidgetSize,
          config: {}
        });

      if (error) throw error;
      
      toast.success('Widget added successfully');
      setIsAddWidgetDialogOpen(false);
      setNewWidgetTitle('');
      refetchWidgets();
    } catch (error) {
      console.error('Error adding widget:', error);
      toast.error('Failed to add widget');
    }
  };

  // Delete a widget
  const handleDeleteWidget = async (widgetId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;
      
      toast.success('Widget deleted successfully');
      refetchWidgets();
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast.error('Failed to delete widget');
    }
  };

  // Delete a dashboard
  const handleDeleteDashboard = async (dashboardId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_configs')
        .delete()
        .eq('id', dashboardId);

      if (error) throw error;
      
      toast.success('Dashboard deleted successfully');
      refetchDashboards();
      
      // Reset selected dashboard if it was deleted
      if (selectedDashboard === dashboardId) {
        setSelectedDashboard(null);
        setActiveTab('overview');
      }
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast.error('Failed to delete dashboard');
    }
  };

  // Render widget based on type
  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.widget_type) {
      case 'revenue-chart':
        return (
          <Card className={`widget-${widget.size}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">{widget.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteWidget(widget.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>
        );
      case 'top-services':
        return (
          <Card className={`widget-${widget.size}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">{widget.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteWidget(widget.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <TopServicesChart />
            </CardContent>
          </Card>
        );
      case 'daily-revenue':
        return (
          <Card className={`widget-${widget.size}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">{widget.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteWidget(widget.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <DailyRevenue expanded={true} locations={locations} />
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className={`widget-${widget.size}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">{widget.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteWidget(widget.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">Widget content</p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Dashboard</h2>
          <p className="text-muted-foreground">
            Track and analyze your business financial performance
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Create a custom dashboard to track specific metrics
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Dashboard Name</Label>
                <Input
                  id="name"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="Sales Overview"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                  placeholder="Track daily and monthly sales performance"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDashboard}>Create Dashboard</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="custom">Custom Dashboards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                <div className="mt-4 h-[80px]">
                  <RevenueChart />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹3,456</div>
                <p className="text-xs text-muted-foreground">+2.4% from last month</p>
                <div className="mt-4 h-[80px]">
                  <RevenueChart />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">245</div>
                <p className="text-xs text-muted-foreground">+8.3% from last month</p>
                <div className="mt-4 h-[80px]">
                  <RevenueChart />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Revenue by Service</CardTitle>
                <CardDescription>Top performing services by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <TopServicesChart />
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Revenue breakdown by day</CardDescription>
              </CardHeader>
              <CardContent>
                <DailyRevenue expanded={true} locations={locations} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-6">
          {isDashboardsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : dashboards && dashboards.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {dashboards.map((dashboard) => (
                  <Button
                    key={dashboard.id}
                    variant={selectedDashboard === dashboard.id ? "default" : "outline"}
                    onClick={() => setSelectedDashboard(dashboard.id)}
                    className="flex items-center gap-2"
                  >
                    {dashboard.name}
                    {selectedDashboard === dashboard.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDashboard(dashboard.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </Button>
                ))}
              </div>
              
              {selectedDashboard && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                      {dashboards.find(d => d.id === selectedDashboard)?.name}
                    </h3>
                    <Dialog open={isAddWidgetDialogOpen} onOpenChange={setIsAddWidgetDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Widget
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Widget</DialogTitle>
                          <DialogDescription>
                            Add a widget to your custom dashboard
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="widget-title">Widget Title</Label>
                            <Input
                              id="widget-title"
                              value={newWidgetTitle}
                              onChange={(e) => setNewWidgetTitle(e.target.value)}
                              placeholder="Revenue Trend"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="widget-type">Widget Type</Label>
                            <Select value={newWidgetType} onValueChange={setNewWidgetType}>
                              <SelectTrigger id="widget-type">
                                <SelectValue placeholder="Select widget type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="revenue-chart">Revenue Chart</SelectItem>
                                <SelectItem value="top-services">Top Services</SelectItem>
                                <SelectItem value="daily-revenue">Daily Revenue</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="widget-size">Widget Size</Label>
                            <Select value={newWidgetSize} onValueChange={setNewWidgetSize}>
                              <SelectTrigger id="widget-size">
                                <SelectValue placeholder="Select widget size" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddWidgetDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddWidget}>Add Widget</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {isWidgetsLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-60 w-full" />
                      ))}
                    </div>
                  ) : widgets && widgets.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {widgets.map((widget) => renderWidget(widget))}
                    </div>
                  ) : (
                    <div className="flex h-60 items-center justify-center rounded-md border border-dashed">
                      <div className="text-center">
                        <h3 className="mb-2 text-lg font-medium">No widgets yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add widgets to start building your dashboard
                        </p>
                        <Button onClick={() => setIsAddWidgetDialogOpen(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Widget
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-md border border-dashed">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-medium">No dashboards created</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a custom dashboard to track specific metrics
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Dashboard
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <style>
        {`
          .widget-small {
            grid-column: span 1;
          }
          .widget-medium {
            grid-column: span 1;
          }
          .widget-large {
            grid-column: span 2;
          }
          @media (max-width: 768px) {
            .widget-large {
              grid-column: span 1;
            }
          }
        `}
      </style>
    </div>
  );
}
