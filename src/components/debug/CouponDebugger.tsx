
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/components/cart/CartContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCoupons } from '@/hooks/use-coupons';

export function CouponDebugger() {
  const [allCoupons, setAllCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { appliedCouponId } = useCart();
  const { coupons, isLoading: couponsLoading } = useCoupons();
  
  useEffect(() => {
    const fetchAllCoupons = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .order('code');
          
        if (error) throw error;
        console.log("All coupons from debugger:", data);
        setAllCoupons(data || []);
      } catch (error) {
        console.error("Error fetching coupons in debugger:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllCoupons();
  }, []);

  if (isLoading) {
    return <div>Loading coupon debug data...</div>;
  }

  return (
    <Card className="p-4 m-4">
      <h3 className="font-medium text-lg mb-2">Coupon Debugger</h3>
      <div className="text-sm text-muted-foreground mb-2">
        <div><strong>Applied Coupon ID:</strong> {appliedCouponId || 'None'}</div>
        <div><strong>Coupons from useCoupons hook:</strong> {couponsLoading ? 'Loading...' : coupons.length}</div>
      </div>
      <div className="border rounded p-2">
        <h4 className="font-medium">All Coupons ({allCoupons.length})</h4>
        {allCoupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coupons found in database</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {allCoupons.map(coupon => (
              <li key={coupon.id} className={`text-sm p-2 border rounded ${appliedCouponId === coupon.id ? 'bg-green-50 border-green-300' : ''}`}>
                <div><strong>ID:</strong> {coupon.id}</div>
                <div><strong>Code:</strong> {coupon.code}</div>
                <div><strong>Type:</strong> {coupon.discount_type}</div>
                <div><strong>Value:</strong> {coupon.discount_value}</div>
                <div><strong>Active:</strong> <Badge variant={coupon.is_active ? "success" : "secondary"}>{coupon.is_active ? 'Yes' : 'No'}</Badge></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
