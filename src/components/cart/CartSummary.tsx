
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Clock, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';

interface CartSummaryProps {
  hideButtons?: boolean;
  adjustedPrices?: Record<string, number>;
  pointsDiscount?: number;
}

export const CartSummary: React.FC<CartSummaryProps> = ({ 
  hideButtons = false,
  adjustedPrices = {},
  pointsDiscount = 0 
}) => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndCart = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        setUser(profile);
        
        const { data: cartData } = await supabase
          .from('cart_items')
          .select('*, service:service_id(*), package:package_id(*)')
          .eq('customer_id', user.id)
          .eq('status', 'pending');
          
        setCartItems(cartData || []);
      }
      
      setLoading(false);
    };
    
    fetchUserAndCart();
  }, []);

  const subtotal = cartItems.reduce((total, item) => {
    const itemPrice = item.service?.selling_price || item.package?.price || 0;
    return total + itemPrice;
  }, 0);

  const totalWithDiscounts = Math.max(0, subtotal - pointsDiscount);

  const totalDuration = cartItems.reduce((total, item) => {
    const duration = item.service?.duration || 0;
    return total + duration;
  }, 0);

  const handleProceedToCheckout = () => {
    navigate('/unified-scheduling');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-5 w-1/2 bg-gray-200 rounded"></div>
            <div className="h-5 w-2/3 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Your Cart
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('/services')}>Browse Services</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Your Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cartItems.map((item) => {
          const isService = !!item.service;
          const itemData = isService ? item.service : item.package;
          const itemId = isService ? item.service.id : item.package.id;
          const originalPrice = isService ? item.service.selling_price : item.package.price;
          const adjustedPrice = adjustedPrices[itemId];
          const displayPrice = adjustedPrice !== undefined ? adjustedPrice : originalPrice;
          
          return (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{itemData.name}</p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Badge variant={isService ? "default" : "secondary"} className="mr-1">
                      {isService ? "Service" : "Package"}
                    </Badge>
                    
                    {isService && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{itemData.duration} mins</span>
                      </div>
                    )}
                  </div>
                  
                  {adjustedPrice !== undefined && (
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(originalPrice)}
                      </p>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                        Points discount applied
                      </Badge>
                    </div>
                  )}
                </div>
                <p className={`font-medium ${adjustedPrice !== undefined ? "text-green-600" : ""}`}>
                  {formatPrice(displayPrice)}
                </p>
              </div>
            </div>
          );
        })}
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Loyalty Points Discount</span>
              <span>-{formatPrice(pointsDiscount)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-medium text-base pt-2">
            <span>Total</span>
            <span>{formatPrice(totalWithDiscounts)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm mt-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Total Duration: {totalDuration} mins</span>
        </div>
      </CardContent>
      
      {!hideButtons && (
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={handleProceedToCheckout} className="w-full">
            Proceed to Booking
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button variant="outline" onClick={() => navigate('/services')} className="w-full">
            Add More Services
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
