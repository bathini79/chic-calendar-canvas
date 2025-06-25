import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  RefreshCw,
  Columns,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableColumn {
  id: string;
  label: string;
  key: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: "text" | "number" | "currency" | "date" | "badge" | "actions";
  width?: string;
  align?: "left" | "center" | "right";
  visible?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableRow {
  id: string;
  [key: string]: any;
}

export interface TableFilter {
  column: string;
  value: string;
  operator?: "equals" | "contains" | "greaterThan" | "lessThan";
}

export interface TableSort {
  column: string;
  direction: "asc" | "desc";
}

interface ReportsDataTableProps {
  title?: string;
  description?: string;
  columns: TableColumn[];
  data: TableRow[];
  loading?: boolean;
  error?: string;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (query: string) => void;
  onFilter?: (filters: TableFilter[]) => void;
  onSort?: (sort: TableSort) => void;
  onExport?: (format: "csv" | "excel" | "pdf") => void;
  onRefresh?: () => void;
  className?: string;
  emptyMessage?: string;
  showFooter?: boolean;
  footerData?: Record<string, any>;
}

export function ReportsDataTable({
  title = "Data Table",
  description,
  columns: initialColumns,
  data,
  loading = false,
  error,
  searchable = true,
  filterable = true,
  exportable = true,
  selectable = false,
  pagination = true,
  pageSize = 10,
  totalCount,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onFilter,
  onSort,
  onExport,
  onRefresh,
  className,
  emptyMessage = "No data available",
  showFooter = false,
  footerData,
}: ReportsDataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortState, setSortState] = useState<TableSort | null>(null);
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    initialColumns.filter(col => col.visible !== false).map(col => col.id)
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Filter visible columns
  const columns = useMemo(() => {
    return initialColumns.filter(col => visibleColumns.includes(col.id));
  }, [initialColumns, visibleColumns]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Handle sort
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    const newDirection = 
      sortState?.column === columnKey && sortState.direction === "asc" 
        ? "desc" 
        : "asc";
    
    const newSort = { column: columnKey, direction: newDirection };
    setSortState(newSort);
    onSort?.(newSort);
  };

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortState?.column !== columnKey) return <SortAsc className="h-4 w-4 opacity-40" />;
    return sortState.direction === "asc" 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  // Handle export
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    onExport?.(format);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Format cell value based on column type
  const formatCellValue = (value: any, column: TableColumn, row: TableRow) => {
    if (column.render) {
      return column.render(value, row);
    }

    switch (column.type) {
      case "currency":
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(value || 0);
      
      case "number":
        return new Intl.NumberFormat('en-IN').format(value || 0);
      
      case "date":
        if (!value) return "—";
        return new Date(value).toLocaleDateString('en-IN');
      
      case "badge":
        return (
          <Badge variant={value?.variant || "default"} className={value?.className}>
            {value?.label || value}
          </Badge>
        );
      
      default:
        return value || "—";
    }
  };

  // Calculate pagination
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount || data.length);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            )}

            {/* Filters */}
            {filterable && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {initialColumns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={() => toggleColumnVisibility(column.id)}
                    className="flex items-center justify-between"
                  >
                    <span>{column.label}</span>
                    {visibleColumns.includes(column.id) ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            {exportable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Refresh */}
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border rounded-lg">
          <ScrollArea className="h-[600px]">
            <Table>
              {description && (
                <TableCaption className="py-4">
                  {description}
                </TableCaption>
              )}
              
              <TableHeader>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === data.length && data.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(data.map(row => row.id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        className="rounded border border-input"
                      />
                    </TableHead>
                  )}
                  
                  {columns.map((column) => (
                    <TableHead
                      key={column.id}
                      className={cn(
                        column.sortable && "cursor-pointer hover:bg-muted/50",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.width && `w-[${column.width}]`
                      )}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className={cn(
                        "flex items-center gap-1",
                        column.align === "right" && "justify-end",
                        column.align === "center" && "justify-center"
                      )}>
                        {column.label}
                        {column.sortable && renderSortIcon(column.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, index) => (
                    <TableRow key={index}>
                      {selectable && (
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell key={column.id}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                      <div className="text-destructive">
                        Error loading data: {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {emptyMessage}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        selectedRows.includes(row.id) && "bg-muted/50",
                        "hover:bg-muted/30"
                      )}
                    >
                      {selectable && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(row.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(prev => [...prev, row.id]);
                              } else {
                                setSelectedRows(prev => prev.filter(id => id !== row.id));
                              }
                            }}
                            className="rounded border border-input"
                          />
                        </TableCell>
                      )}
                      
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center"
                          )}
                        >
                          {formatCellValue(row[column.key], column, row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>

              {showFooter && footerData && (
                <TableFooter>
                  <TableRow>
                    {selectable && <TableCell />}
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          "font-medium",
                          column.align === "right" && "text-right",
                          column.align === "center" && "text-center"
                        )}
                      >
                        {formatCellValue(footerData[column.key], column, footerData)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </ScrollArea>
        </div>

        {/* Pagination */}
        {pagination && data.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange?.(parseInt(value))}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {startIndex}–{endIndex} of {totalCount || data.length}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage - 2 + i;
                    if (page < 1 || page > totalPages) return null;
                    
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange?.(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
