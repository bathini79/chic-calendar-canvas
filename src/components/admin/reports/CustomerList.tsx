
import React, { useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, Download, Filter, Loader, Search, Star, SortAsc, SortDesc, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { CustomerDetails } from './CustomerDetails';
import { CustomerSummary } from './CustomerSummary';

interface CustomerListProps {
  onBack?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'full_name' | 'created_at' | 'first_appt' | 'last_appt' | null;

export function CustomerList({ onBack }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('90');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Fetch customer data
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers', timeRange, sortField, sortDirection],
    queryFn: async () => {
      try {
        const startDate = format(subDays(new Date(), parseInt(timeRange)), 'yyyy-MM-dd');
        
        console.log('Fetching customer data from:', startDate);
        
        // Fetch profiles (customers)
        let query = supabase
          .from('profiles')
          .select('*, appointments(id, created_at, start_time)')
          .eq('role', 'customer')
          .gte('created_at', startDate);
          
        if (sortField && sortDirection) {
          query = query.order(sortField, { ascending: sortDirection === 'asc' });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        console.log(`Retrieved ${data?.length || 0} customers`);
        
        // Process data to include first and last appointment dates
        const processedData = data?.map(customer => {
          const appointments = customer.appointments || [];
          const sortedAppointments = [...appointments].sort((a, b) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
          
          return {
            ...customer,
            first_appt: sortedAppointments.length > 0 ? sortedAppointments[0].start_time : null,
            last_appt: sortedAppointments.length > 0 ? sortedAppointments[sortedAppointments.length - 1].start_time : null,
            appointment_count: appointments.length
          };
        });
        
        return processedData || [];
      } catch (err) {
        console.error('Error fetching customer data:', err);
        throw err;
      }
    }
  });
  
  const timeRangeOptions = [
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '180', label: 'Last 180 days' },
    { value: '365', label: 'Last 365 days' },
  ];
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === null) {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    if (sortDirection === 'asc') return <SortAsc className="h-4 w-4 ml-1" />;
    if (sortDirection === 'desc') return <SortDesc className="h-4 w-4 ml-1" />;
    return null;
  };
  
  const filteredCustomers = customers?.filter(customer => 
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_number?.includes(searchQuery)
  ) || [];

  // If a customer is selected, show their details
  if (selectedCustomerId) {
    return (
      <CustomerDetails 
        customerId={selectedCustomerId} 
        onBack={() => setSelectedCustomerId(null)} 
      />
    );
  }

  // Handle error display
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold">Customer List</h2>
              <p className="text-sm text-muted-foreground">
                Comprehensive list of all active clients
              </p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-red-500 mb-4">
                Error loading customer data
              </div>
              <p className="text-muted-foreground mb-4">
                {(error as Error).message || 'An unexpected error occurred'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold">Client list</h2>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Star className="h-4 w-4" />
                <span className="sr-only">Favorite</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Comprehensive list of all active clients
            </p>
          </div>
        </div>
        <div>
          <Button variant="outline">
            Options <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Customer Summary Component */}
      <CustomerSummary />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search clients..."
                    className="pl-8 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Data from {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <Button variant="outline" className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            
            <div className="overflow-auto rounded-md border">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Loading customer data...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <Search className="h-16 w-16 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search or filter to find what you\'re looking for.' : 'No customers found in the selected time period.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('full_name')}
                      >
                        <div className="flex items-center">
                          Client {renderSortIcon('full_name')}
                        </div>
                      </TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Mobile number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead 
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Added on {renderSortIcon('created_at')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('first_appt')}
                      >
                        <div className="flex items-center">
                          First appt. {renderSortIcon('first_appt')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('last_appt')}
                      >
                        <div className="flex items-center">
                          Last appt. {renderSortIcon('last_appt')}
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{customer.full_name || 'N/A'}</TableCell>
                        <TableCell>{customer.gender || '—'}</TableCell>
                        <TableCell>
                          {customer.birth_date ? 
                            Math.floor((new Date().getTime() - new Date(customer.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) 
                            : '—'}
                        </TableCell>
                        <TableCell>{customer.phone_number || '—'}</TableCell>
                        <TableCell>{customer.email || '—'}</TableCell>
                        <TableCell>
                          {customer.created_at 
                            ? format(new Date(customer.created_at), 'dd MMM yyyy')
                            : '—'
                          }
                        </TableCell>
                        <TableCell>
                          {customer.first_appt 
                            ? format(new Date(customer.first_appt), 'dd MMM yyyy')
                            : '—'
                          }
                        </TableCell>
                        <TableCell>
                          {customer.last_appt 
                            ? format(new Date(customer.last_appt), 'dd MMM yyyy')
                            : '—'
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedCustomerId(customer.id)}
                          >
                            <User className="h-4 w-4" />
                            <span className="sr-only">View details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
