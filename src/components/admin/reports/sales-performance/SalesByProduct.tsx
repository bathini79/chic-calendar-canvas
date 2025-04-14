
import React, { useState, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileType, 
  BarChart2, 
  LineChart,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bar, 
  BarChart, 
  LineChart as RechartLine, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

type SalesByProductProps = {
  employeeId: string;
  dateRange: string;
};

type ProductSalesData = {
  id: string;
  name: string;
  count: number;
  grossSales: number;
  discount: number;
  netSales: number;
  totalSales: number;
  category: string;
};

export const SalesByProduct = ({ employeeId, dateRange }: SalesByProductProps) => {
  const [activeTab, setActiveTab] = useState<string>("report");
  const [productSalesData, setProductSalesData] = useState<ProductSalesData[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalSummary, setTotalSummary] = useState<{
    count: number;
    grossSales: number;
    discount: number;
    netSales: number;
    totalSales: number;
  }>({
    count: 0,
    grossSales: 0,
    discount: 0,
    netSales: 0,
    totalSales: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchProductSalesData();
  }, [employeeId, dateRange, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProductSalesData = async () => {
    setIsLoading(true);
    try {
      // Determine date range for query
      const now = new Date();
      let startDate = new Date();
      
      if (dateRange === "30") {
        startDate.setDate(now.getDate() - 30);
      } else if (dateRange === "90") {
        startDate.setDate(now.getDate() - 90);
      } else if (dateRange === "365") {
        startDate.setFullYear(now.getFullYear() - 1);
      } else {
        // Default to 30 days if custom range not implemented
        startDate.setDate(now.getDate() - 30);
      }

      // Format dates for Supabase query
      const startDateStr = startDate.toISOString();
      const endDateStr = now.toISOString();

      // Build query based on filters
      let query = supabase
        .from('bookings')
        .select(`
          id,
          price_paid,
          original_price,
          service_id,
          employee_id,
          appointments!inner(
            start_time,
            discount_value,
            status
          ),
          services(
            id,
            name,
            category_id,
            categories(
              id,
              name
            )
          )
        `)
        .eq('appointments.status', 'completed')
        .gte('appointments.start_time', startDateStr)
        .lte('appointments.start_time', endDateStr);

      // Add employee filter if specific employee selected
      if (employeeId !== "all") {
        query = query.eq('employee_id', employeeId);
      }

      const { data: bookingsData, error } = await query;

      if (error) throw error;

      // Process and transform the data
      const productMap = new Map<string, ProductSalesData>();
      
      bookingsData?.forEach(booking => {
        // Skip if service data is missing
        if (!booking.services) return;
        
        const serviceId = booking.services.id;
        const serviceName = booking.services.name;
        const categoryId = booking.services.category_id;
        const categoryName = booking.services.categories?.name || 'Uncategorized';
        
        // Skip if not in the selected category
        if (selectedCategory !== 'all' && categoryId !== selectedCategory) return;
        
        const pricePaid = booking.price_paid || 0;
        const originalPrice = booking.original_price || pricePaid;
        const discount = originalPrice - pricePaid;
        
        // Add to or update product in map
        if (productMap.has(serviceId)) {
          const existingData = productMap.get(serviceId)!;
          productMap.set(serviceId, {
            ...existingData,
            count: existingData.count + 1,
            grossSales: existingData.grossSales + originalPrice,
            discount: existingData.discount + discount,
            netSales: existingData.netSales + pricePaid,
            totalSales: existingData.totalSales + pricePaid,
          });
        } else {
          productMap.set(serviceId, {
            id: serviceId,
            name: serviceName,
            count: 1,
            grossSales: originalPrice,
            discount: discount,
            netSales: pricePaid,
            totalSales: pricePaid,
            category: categoryName,
          });
        }
      });
      
      // Convert map to array and sort by sales volume
      const productsArray = Array.from(productMap.values())
        .sort((a, b) => b.totalSales - a.totalSales);
      
      setProductSalesData(productsArray);
      
      // Calculate totals for summary row
      const totalCount = productsArray.reduce((sum, item) => sum + item.count, 0);
      const totalGrossSales = productsArray.reduce((sum, item) => sum + item.grossSales, 0);
      const totalDiscount = productsArray.reduce((sum, item) => sum + item.discount, 0);
      const totalNetSales = productsArray.reduce((sum, item) => sum + item.netSales, 0);
      const totalAllSales = productsArray.reduce((sum, item) => sum + item.totalSales, 0);
      
      setTotalSummary({
        count: totalCount,
        grossSales: totalGrossSales,
        discount: totalDiscount,
        netSales: totalNetSales,
        totalSales: totalAllSales
      });
      
    } catch (error) {
      console.error('Error fetching product sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Export data functions
  const exportToExcel = () => {
    // Implementation would require a library like xlsx
    console.log('Export to Excel functionality would be implemented here');
  };

  const exportToCSV = () => {
    if (productSalesData.length === 0) return;
    
    // Create CSV content
    let csvContent = "Name,Count,Gross Sales,Discount,Net Sales,Total Sales\n";
    
    // Add total row
    csvContent += `Total,${totalSummary.count},${totalSummary.grossSales},${totalSummary.discount},${totalSummary.netSales},${totalSummary.totalSales}\n`;
    
    // Add data rows
    productSalesData.forEach(item => {
      csvContent += `"${item.name}",${item.count},${item.grossSales},${item.discount},${item.netSales},${item.totalSales}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `SalesByProduct_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to document, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // Implementation would require a library like jspdf
    console.log('Export to PDF functionality would be implemented here');
  };

  // Prepare data for charts
  const getChartData = () => {
    return productSalesData.slice(0, 10).map(item => ({
      name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
      sales: item.totalSales,
      count: item.count
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Sales by Product</CardTitle>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileType className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="report" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              <span>Report</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="report" className="w-full">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {/* Summary row */}
                  <TableRow className="font-medium bg-muted/30">
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{totalSummary.count}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalSummary.grossSales)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalSummary.discount)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalSummary.netSales)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalSummary.totalSales)}</TableCell>
                  </TableRow>
                  
                  {/* Product rows */}
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">Loading data...</TableCell>
                    </TableRow>
                  ) : productSalesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">No data available for the selected filters.</TableCell>
                    </TableRow>
                  ) : (
                    productSalesData.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="flex items-center gap-1">
                          {product.name}
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Product Details</p>
                                <p className="text-sm text-muted-foreground">Category: {product.category}</p>
                                <p className="text-sm text-muted-foreground">Average sale price: {formatCurrency(product.totalSales / product.count)}</p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </TableCell>
                        <TableCell className="text-right">{product.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.grossSales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.discount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.netSales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.totalSales)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="w-full">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Bar Chart - Top Products by Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {productSalesData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(value) => `Product: ${value}`}
                        />
                        <Legend />
                        <Bar dataKey="sales" fill="#4f46e5" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              {/* Line Chart - Top Products by Count */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Products by Units Sold</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {productSalesData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartLine data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`${value} units`, "Count"]}
                          labelFormatter={(value) => `Product: ${value}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#10b981" name="Units Sold" />
                      </RechartLine>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
