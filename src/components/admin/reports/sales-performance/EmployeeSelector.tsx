import React, { useEffect, useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';

type EmployeeSelectorProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export const EmployeeSelector = ({ value, onValueChange }: EmployeeSelectorProps) => {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('employees')
          .select(`
            id, 
            name,
            employment_types!inner(permissions)
          `)
          .eq('status', 'active');

        if (error) throw error;

        // Filter to employees with perform_services permission
        const employeesWithPermission = data?.filter(employee => {
          const permissions = employee.employment_types?.permissions || [];
          return Array.isArray(permissions) && permissions.includes('perform_services');
        }) || [];

        setEmployees([
          { id: 'all', name: 'All Stylists' },
          ...employeesWithPermission
        ]);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={isLoading ? "Loading..." : "All Employees"} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Employees</SelectLabel>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
