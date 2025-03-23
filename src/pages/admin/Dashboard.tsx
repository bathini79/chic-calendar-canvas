
import { MetricCard } from '@/components/admin/dashboard/MetricCard';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { TopServicesChart } from '@/components/admin/dashboard/TopServicesChart';
import { FinancialDashboard } from '@/components/admin/dashboard/FinancialDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecentSalesList } from '@/components/admin/sales/RecentSalesList';

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard 
              title="Total Sales" 
              value="$24,329" 
              delta={12.5} 
              trend="up"
              description="Compared to last month"
            />
            <MetricCard 
              title="New Customers" 
              value="573" 
              delta={-2.7} 
              trend="down"
              description="Compared to last month"
            />
            <MetricCard 
              title="Upcoming Appointments" 
              value="189" 
              delta={8.1} 
              trend="up"
              description="For the next 7 days"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <RevenueChart />
              <TopServicesChart />
            </div>
            <div className="space-y-6">
              <RecentSalesList />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sales" className="space-y-6">
          <FinancialDashboard />
        </TabsContent>
        
        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Appointment Analytics</h3>
              <p className="text-gray-500">
                This dashboard will show appointment metrics (under development).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
