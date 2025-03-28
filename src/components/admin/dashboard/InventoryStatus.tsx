
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LocationSelector } from './LocationSelector';
import { Link } from 'react-router-dom';
import { ChevronRight } from "lucide-react";

export const InventoryStatus = ({ locations, inventoryLocationId, setInventoryLocationId }) => {
  const [lowStockItems, setLowStockItems] = useState({ count: 0, criticalCount: 0, totalItems: 0 });

  const fetchLowStockItems = useCallback(async () => {
    try {
      let data, error;
      if (inventoryLocationId === "all") {
        ({ data, error } = await supabase.from("inventory_items").select("id, quantity, minimum_quantity"));
      } else {
        ({ data, error } = await supabase.from("inventory_location_items").select("id, quantity, minimum_quantity").eq("location_id", inventoryLocationId));
      }
      if (error) throw error;

      const totalItems = data.length;
      const lowStockCount = data.filter(item => item.quantity <= item.minimum_quantity).length;
      const criticalCount = data.filter(item => item.quantity <= item.minimum_quantity * 0.5).length;

      setLowStockItems({ count: lowStockCount, criticalCount, totalItems });
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      setLowStockItems({ count: 0, criticalCount: 0, totalItems: 0 });
    }
  }, [inventoryLocationId]);

  useEffect(() => { fetchLowStockItems(); }, [fetchLowStockItems]);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
        <CardTitle className="text-lg">Inventory Status</CardTitle>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full sm:w-auto">
          <LocationSelector value={inventoryLocationId} onChange={setInventoryLocationId} className="w-full sm:w-[160px]" locations={locations} />
          <Link to="/admin/inventory" className="text-sm text-blue-600 hover:underline flex items-center">
            View Inventory <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 text-gray-500">Total Items</h3>
            <p className="text-2xl font-bold">{lowStockItems.totalItems || 0}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 text-gray-500">Low Stock Items</h3>
            <Link to="/admin/inventory" className="text-2xl font-bold text-yellow-500 hover:text-yellow-600">{lowStockItems.count || 0}</Link>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 text-gray-500">Critical Stock</h3>
            <Link to="/admin/inventory" className="text-2xl font-bold text-red-500 hover:text-red-600">{lowStockItems.criticalCount || 0}</Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
