import React, { useEffect } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Standard page size options to use across the app
export const STANDARD_PAGE_SIZES = [10, 20, 50, 100];

export interface DataPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  showPageSizeSelector?: boolean;
  // Using the standard page sizes by default
  pageSizeOptions?: number[];
}

export function DataPagination({ 
  currentPage, 
  totalItems, 
  pageSize, 
  onPageChange, 
  onPageSizeChange,
  className = "",
  showPageSizeSelector = true,
  pageSizeOptions = STANDARD_PAGE_SIZES,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // If current page is invalid (larger than total pages), reset to page 1
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(1);
    }
  }, [currentPage, totalPages, onPageChange, totalItems, pageSize]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    if (newSize !== pageSize) {
      onPageSizeChange(newSize);
      // Reset to first page when changing page size
      onPageChange(1);
    }
  };

  // Generate page numbers to display
  const generatePagination = () => {
    let pages = [];
    const maxVisiblePages = 5;
    
    // Force at least one page to prevent empty pagination
    if (totalPages <= 0) {
      return [1];
    }
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are fewer than maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      // For current pages close to the start
      if (currentPage <= 3) {
        pages.push(2, 3, 4);
        pages.push(null); // represents ellipsis
      } 
      // For current pages close to the end
      else if (currentPage >= totalPages - 2) {
        pages.push(null); // represents ellipsis
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1);
      } 
      // For current pages in the middle
      else {
        pages.push(null); // represents ellipsis
        pages.push(currentPage - 1, currentPage, currentPage + 1);
        pages.push(null); // represents ellipsis
      }
      
      // Always include last page if there's more than one page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 w-full ${className}`}>
      {/* Info text showing current range and total */}
      <div className="text-sm text-muted-foreground order-2 sm:order-1">
        {totalItems > 0 ? (
          <>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </>
        ) : (
          <>No items found</>
        )}
      </div>

      <div className="flex items-center gap-4 order-1 sm:order-2">
        {/* Page size selector */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
              defaultValue={pageSize.toString()}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pagination component - always show even if just one page */}
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(currentPage - 1)}
                className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            
            {generatePagination().map((page, index) => (
              page === null ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={`page-${page}`}>
                  <PaginationLink
                    onClick={() => handlePageChange(page as number)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            ))}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                aria-disabled={currentPage === totalPages || totalPages <= 1}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}