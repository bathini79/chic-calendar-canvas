import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Download, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface ReportColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'percentage';
  format?: (value: any) => string;
  width?: string;
}

export interface ReportFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date';
  options?: { value: string; label: string }[];
}

interface ReportDataTableProps {
  data: any[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  title: string;
  description?: string;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  onRowClick?: (row: any) => void;
  exportFormats?: ('csv' | 'excel' | 'pdf')[];
  loading?: boolean;
  // Search term passed from parent
  externalSearchTerm?: string;
  // Infinite scroll props
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  totalCount?: number;
}

export function ReportDataTable({
  data,
  columns,
  filters = [],
  title,
  description,
  searchPlaceholder = "Search...",
  itemsPerPage = 25,
  onRowClick,
  exportFormats = ['csv', 'excel', 'pdf'],
  loading = false,
  externalSearchTerm = '',
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  totalCount = 0
}: ReportDataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  
  // Infinite scroll refs
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Format value based on column type
  const formatValue = (value: any, column: ReportColumn) => {
    if (value === null || value === undefined) return '-';
    
    if (column.format) {
      return column.format(value);
    }
    
    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${parseFloat(value).toFixed(1)}%`;
      case 'date':
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return '-';
          }
          return format(date, 'MMM dd, yyyy');
        } catch (error) {
          return '-';
        }
      case 'number':
        return Number(value).toLocaleString();
      case 'badge':
        return value;
      default:
        return String(value);
    }
  };  // Filter and search data (for infinite scroll, we process all data at once)
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply external search (from parent component)
    if (externalSearchTerm) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return String(value).toLowerCase().includes(externalSearchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => {
          const rowValue = String(row[key]).toLowerCase();
          return rowValue.includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filtered;
  }, [data, externalSearchTerm, filterValues, sortColumn, sortDirection, columns]);

  // For infinite scroll, we show all filtered data (data comes pre-paginated from the query)
  const displayData = filteredData;

  // Handlers
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };
  const handleExport = (format: string) => {
    try {
      const exportData = displayData.map(row => {
        const exportRow: any = {};
        columns.forEach(column => {
          exportRow[column.label] = formatValue(row[column.key], column);
        });
        return exportRow;
      });

      if (format === 'csv') {
        // Convert to CSV
        const headers = columns.map(col => col.label).join(',');
        const rows = exportData.map(row => 
          columns.map(col => {
            const value = row[col.label];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        ).join('\n');
        
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales-performance-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('CSV file downloaded successfully!');
      } else if (format === 'excel') {
        // For Excel export, we'll use the same CSV approach but with .xlsx extension
        // In a real implementation, you'd want to use a library like xlsx
        const headers = columns.map(col => col.label).join('\t');
        const rows = exportData.map(row => 
          columns.map(col => row[col.label]).join('\t')
        ).join('\n');
        
        const tsv = `${headers}\n${rows}`;
        const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales-performance-${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Excel file downloaded successfully!');
      } else if (format === 'pdf') {
        // For PDF, we'll create a simple text-based version
        // In a real implementation, you'd want to use a library like jsPDF
        const content = `Sales Performance Report - ${new Date().toLocaleDateString()}\n\n` +
          exportData.map(row => 
            columns.map(col => `${col.label}: ${row[col.label]}`).join(' | ')
          ).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales-performance-${new Date().toISOString().split('T')[0]}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Report downloaded successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  const getBadgeVariant = (value: string) => {
    switch (value?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'active':
        return 'default';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'cancelled':
      case 'failed':
      case 'inactive':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  const handleRowClick = (row: any) => {
    if (onRowClick) {
      onRowClick(row);
    } else {
      setSelectedRow(row);
    }
  };  // Infinite scroll setup
  useEffect(() => {
    if (!fetchNextPage || !hasNextPage || isFetchingNextPage) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Only set up observer if we have the ref and more pages to load
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('Loading next page via intersection observer...');
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observer.observe(loadMoreRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, displayData.length]);
  return (
    <div className="space-y-4">
      {title && (
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {filters.length > 0 && (
        <div className="mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="p-2 space-y-2">
                {filters.map(filter => (
                  <div key={filter.key}>
                    <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
                    {filter.type === 'select' ? (
                      <Select
                        value={filterValues[filter.key] || ''}
                        onValueChange={(value) => setFilterValues(prev => ({ ...prev, [filter.key]: value }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={`All ${filter.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All</SelectItem>
                          {filter.options?.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={`Filter by ${filter.label.toLowerCase()}...`}
                        value={filterValues[filter.key] || ''}
                        onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                        className="h-8"
                      />
                    )}
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead 
                  key={column.key} 
                  className={`${column.width ? `w-${column.width}` : ''} ${column.sortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col opacity-30 hover:opacity-70 transition-opacity ml-1">
                        <ChevronUp className={`h-2.5 w-2.5 ${sortColumn === column.key && sortDirection === 'asc' ? 'text-primary opacity-100' : 'text-muted-foreground'}`} />
                        <ChevronDown className={`h-2.5 w-2.5 ${sortColumn === column.key && sortDirection === 'desc' ? 'text-primary opacity-100' : 'text-muted-foreground'}`} />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>            {loading ? (
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map(column => (
                    <TableCell key={column.key}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))) : displayData.length > 0 ? (
              displayData.map((row, index) => (
                <TableRow
                  key={index}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => handleRowClick(row)}
                >
                  {columns.map(column => (
                    <TableCell key={column.key}>
                      {column.type === 'badge' ? (
                        <Badge variant={getBadgeVariant(row[column.key])}>
                          {formatValue(row[column.key], column)}
                        </Badge>
                      ) : (
                        formatValue(row[column.key], column)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>        </Table>
          {/* Infinite scroll loader */}
        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="py-4 text-center border-t"
          >
            {isFetchingNextPage ? (
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                <span className="text-sm text-muted-foreground">
                  Loading more...
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchNextPage && fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mx-auto"
                >
                  Load More Records
                </Button>
                <p className="text-sm text-muted-foreground">
                  Or scroll down to load automatically
                </p>
              </div>
            )}
          </div>
        )}
      </div>      {/* Show total count information */}
      {totalCount > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {displayData.length} of {totalCount} results
          {externalSearchTerm && ` (filtered)`}
        </div>
      )}
    </div>
  );
}
