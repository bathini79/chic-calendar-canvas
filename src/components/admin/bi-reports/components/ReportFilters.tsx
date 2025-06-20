import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface ReportFilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'dateRange' | 'multiSelect';
  options?: FilterOption[];
  placeholder?: string;
  multiple?: boolean;
}

interface ReportFiltersProps {
  filters: ReportFilterConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
  loading?: boolean;
}

export function ReportFilters({ 
  filters, 
  values, 
  onChange, 
  onReset, 
  loading = false 
}: ReportFiltersProps) {
  const hasActiveFilters = Object.values(values || {}).some(value => 
    value !== undefined && value !== null && value !== '' && 
    (Array.isArray(value) ? value.length > 0 : true)
  );
  const renderFilter = (filter: ReportFilterConfig) => {
    const value = (values || {})[filter.key];

    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            disabled={loading}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            disabled={loading}
          />
        );      case 'select':
        return (
          <Select 
            value={value || 'all'} 
            onValueChange={(newValue) => onChange(filter.key, newValue === 'all' ? '' : newValue)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filter.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiSelect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <Select 
              onValueChange={(newValue) => {
                if (newValue && !selectedValues.includes(newValue)) {
                  onChange(filter.key, [...selectedValues, newValue]);
                }
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    disabled={selectedValues.includes(option.value)}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map(selectedValue => {
                  const option = filter.options?.find(opt => opt.value === selectedValue);
                  return (
                    <Badge key={selectedValue} variant="secondary" className="text-xs">
                      {option?.label || selectedValue}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => {
                          onChange(filter.key, selectedValues.filter(v => v !== selectedValue));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'dateRange':
        const dateRange = value as DateRange | undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-full",
                  !dateRange && "text-muted-foreground"
                )}
                disabled={loading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => onChange(filter.key, range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filters.map(filter => (
            <div key={filter.key} className="space-y-2">
              <Label htmlFor={filter.key} className="text-sm font-medium">
                {filter.label}
              </Label>
              {renderFilter(filter)}
            </div>
          ))}
        </div>

        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(values).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                
                const filter = filters.find(f => f.key === key);
                if (!filter) return null;

                let displayValue = '';
                if (filter.type === 'select' || filter.type === 'multiSelect') {
                  if (Array.isArray(value)) {
                    displayValue = value.map(v => {
                      const option = filter.options?.find(opt => opt.value === v);
                      return option?.label || v;
                    }).join(', ');
                  } else {
                    const option = filter.options?.find(opt => opt.value === value);
                    displayValue = option?.label || value;
                  }
                } else if (filter.type === 'dateRange' && value?.from) {
                  displayValue = value.to 
                    ? `${format(value.from, "MMM dd")} - ${format(value.to, "MMM dd")}`
                    : format(value.from, "MMM dd");
                } else {
                  displayValue = String(value);
                }

                return (
                  <Badge key={key} variant="secondary">
                    {filter.label}: {displayValue}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => onChange(key, filter.type === 'multiSelect' ? [] : 
                                               filter.type === 'dateRange' ? undefined : '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
