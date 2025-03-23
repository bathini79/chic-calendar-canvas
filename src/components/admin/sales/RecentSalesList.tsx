
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { useRecentSales, RecentSale } from '@/hooks/use-recent-sales';
import { Badge } from '@/components/ui/badge';
import { PackageIcon, Scissors, Package, Tag } from 'lucide-react';

export function RecentSalesList() {
  const { isLoading, recentSales, fetchRecentSales } = useRecentSales();

  useEffect(() => {
    fetchRecentSales();
  }, []);

  const renderSaleIcon = (sale: RecentSale) => {
    if (sale.type === 'membership') {
      return <Tag size={18} className="text-purple-500" />;
    } else {
      return <Scissors size={18} className="text-blue-500" />;
    }
  };

  const renderSaleAmount = (sale: RecentSale) => {
    if (sale.type === 'appointment') {
      return formatPrice(sale.total_price);
    } else {
      return formatPrice(sale.total_amount);
    }
  };

  const renderSaleDate = (sale: RecentSale) => {
    const date = sale.type === 'appointment' 
      ? new Date(sale.created_at) 
      : new Date(sale.sale_date);
    return format(date, 'dd MMM yyyy, h:mm a');
  };

  const renderSaleType = (sale: RecentSale) => {
    if (sale.type === 'appointment') {
      return <Badge variant="outline" className="bg-blue-50">Appointment</Badge>;
    } else {
      return <Badge variant="outline" className="bg-purple-50">Membership</Badge>;
    }
  };

  const renderSaleName = (sale: RecentSale) => {
    if (sale.type === 'membership' && sale.membership) {
      return `${sale.membership.name} Membership`;
    } else {
      return "Service Appointment";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Sales</CardTitle>
        <CardDescription>Latest appointments and membership sales</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6">Loading recent sales...</div>
        ) : recentSales.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No recent sales found</div>
        ) : (
          <div className="space-y-4">
            {recentSales.slice(0, 10).map((sale) => (
              <div key={`${sale.type}-${sale.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0">
                <div className="p-2 rounded-md bg-gray-100">
                  {renderSaleIcon(sale)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium truncate">{renderSaleName(sale)}</div>
                      <div className="text-sm text-gray-500">{sale.customer.full_name}</div>
                      <div className="text-xs text-gray-400">{renderSaleDate(sale)}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="font-semibold">{renderSaleAmount(sale)}</div>
                      <div className="mt-1">{renderSaleType(sale)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
