import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  EmployeeCompensationSetting,
  PayPeriod,
  ClosedPeriod
} from '../types/payroll-db';
import { 
  CompensationFormData, 
  ClosedPeriodFormData, 
  CompensationHistoryEntry 
} from '../types/payroll';

export function usePayroll() {
  const queryClient = useQueryClient();
  
  // Fetch employee compensation history
  const useEmployeeCompensation = (employeeId: string) => {
    return useQuery({
      queryKey: ['employee-compensation', employeeId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('employee_compensation_settings')
          .select('*')
          .eq('employee_id', employeeId)
          .order('effective_from', { ascending: false });
        
        if (error) throw error;
        
        // Convert to frontend format
        return (data || []).map((item: EmployeeCompensationSetting) => ({
          id: item.id,
          base_amount: item.base_amount,
          effective_from: new Date(item.effective_from),
          effective_to: item.effective_to ? new Date(item.effective_to) : null,
          created_at: new Date(item.created_at)
        })) as CompensationHistoryEntry[];
      },
      enabled: !!employeeId
    });
  };
  
  // Add new compensation entry
  const addEmployeeCompensation = useMutation({
    mutationFn: async ({
      employeeId,
      data
    }: {
      employeeId: string;
      data: CompensationFormData;
    }) => {
      // First, update the effective_to date of the current active compensation
      const { data: currentActive } = await supabase
        .from('employee_compensation_settings')
        .select('id')
        .eq('employee_id', employeeId)
        .is('effective_to', null)
        .single();

      if (currentActive) {
        await supabase
          .from('employee_compensation_settings')
          .update({ effective_to: data.effective_from.toISOString() })
          .eq('id', currentActive.id);
      }

      // Then insert the new compensation record
      const { data: result, error } = await supabase
        .from('employee_compensation_settings')
        .insert({
          employee_id: employeeId,
          base_amount: data.base_amount,
          effective_from: data.effective_from.toISOString(),
          effective_to: null, // This is the new active record
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-compensation', variables.employeeId] });
    },
  });
  
  // Fetch closed periods
  const useClosedPeriods = (locationId?: string) => {
    return useQuery({
      queryKey: ['closed-periods', locationId],
      queryFn: async () => {
        let query = supabase
          .from('closed_periods')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (locationId) {
          // Filter by location if provided
          query = query.contains('location_ids', [locationId]);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data as ClosedPeriod[];
      }
    });
  };
  
  // Add new closed period
  const addClosedPeriod = useMutation({
    mutationFn: async (data: ClosedPeriodFormData) => {
      const { data: result, error } = await supabase
        .from('closed_periods')
        .insert({
          start_date: data.start_date.toISOString(),
          end_date: data.end_date.toISOString(),
          description: data.description,
          location_ids: data.location_ids,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closed-periods'] });
    },
  });
  
  // Update closed period
  const updateClosedPeriod = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: ClosedPeriodFormData;
    }) => {
      const { data: result, error } = await supabase
        .from('closed_periods')
        .update({
          start_date: data.start_date.toISOString(),
          end_date: data.end_date.toISOString(),
          description: data.description,
          location_ids: data.location_ids,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closed-periods'] });
    },
  });
  
  // Delete closed period
  const deleteClosedPeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('closed_periods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closed-periods'] });
    },
  });
  
  return {
    useEmployeeCompensation,
    addEmployeeCompensation,
    useClosedPeriods,
    addClosedPeriod,
    updateClosedPeriod,
    deleteClosedPeriod
  };
}