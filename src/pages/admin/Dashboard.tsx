import { MetricCard } from "@/components/ui/metric-card";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { TopServicesChart } from "@/components/admin/charts/top-services-chart";
import { FinancialDashboard } from "@/components/admin/financials/financial-dashboard";
import { RecentSalesList } from "@/components/admin/sales/RecentSalesList";

export default function Dashboard() {
  const {
    totalRevenue,
    appointmentCount,
    customerCount,
    revenueData,
    topServices,
    isLoading,
  } = useDashboardData();
  
  return (
    <div className="container py-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {/* Top Section with Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Revenue"
          value={totalRevenue}
          isLoading={isLoading}
        />
        <MetricCard
          title="Appointments"
          value={appointmentCount}
          isLoading={isLoading}
        />
        <MetricCard
          title="Customers"
          value={customerCount}
          isLoading={isLoading}
        />
      </div>
      
      {/* Middle Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <RevenueChart data={revenueData} />
        </div>
        <div className="md:col-span-4">
          <TopServicesChart data={topServices} />
        </div>
      </div>
      
      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <FinancialDashboard />
        </div>
        <div className="md:col-span-4">
          <RecentSalesList />
        </div>
      </div>
    </div>
  );
}
