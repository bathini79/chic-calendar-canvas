import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  EmployeeCompensationSetting,
  PayPeriod,
  PayRun,
  PayRunItem,
  ClosedPeriod
} from '../types/payroll-db';
import { 
  CompensationFormData, 
  ClosedPeriodFormData, 
  CompensationHistoryEntry 
} from '../types/payroll';
import { payRunService, AdjustmentData, PayRunSummary } from '../services/payRunService';
import { payPeriodService } from '../services/payPeriodService';

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
    // Pay Periods Queries and Mutations
  const usePayPeriods = (status?: 'active' | 'archived') => {
    return useQuery({
      queryKey: ['pay-periods', status],
      queryFn: async () => {
        return payPeriodService.listPayPeriods(status);
      }
    });
  };

  const createPayPeriod = useMutation({
    mutationFn: async ({
      startDate,
      endDate,
      name
    }: {
      startDate: string;
      endDate: string;
      name: string;
    }) => {
      return payPeriodService.createPayPeriod(startDate, endDate, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-periods'] });
    }
  });

  const archivePayPeriod = useMutation({
    mutationFn: async (id: string) => {
      return payPeriodService.archivePayPeriod(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-periods'] });
    }
  });

  const generateNextPayPeriod = useMutation({
    mutationFn: async () => {
      return payPeriodService.generateNextPayPeriod();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-periods'] });
    }
  });  // Pay Runs Queries and Mutations
  const usePayRuns = (startDate?: string, endDate?: string, locationId?: string, options?: any) => {
    return useQuery({
      queryKey: ['pay-runs', startDate, endDate, locationId],
      queryFn: async () => {
        if (startDate && endDate) {
          // Get pay runs for the specified period
          const payRuns = await payRunService.getPayRunsByPeriod(startDate, endDate, locationId);
          return payRuns;
        }
        return [];
      },
      enabled: !!(startDate && endDate),
      staleTime: options?.staleTime || 0,
      refetchInterval: options?.refetchInterval,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true
    });
  };

  const usePayRunDetails = (payRunId: string) => {
    return useQuery({
      queryKey: ['pay-run-details', payRunId],
      queryFn: async () => {
        return payRunService.getPayRunDetails(payRunId);
      },
      enabled: !!payRunId
    });
  };  const usePayRunSummary = (payRunId: string, options?: any) => {
    return useQuery({
      queryKey: ['pay-run-summary', payRunId],
      queryFn: async () => {
        // Return default values if no payRunId
        if (!payRunId) {
          return {
            earnings: 0,
            other: 0,
            total: 0,
            paid: 0,
            toPay: 0,
            total_employees: 0
          };
        }
        return payRunService.getPayRunSummary(payRunId);
      },
      // Apply defaults or override with provided options
      staleTime: options?.staleTime || 0,
      refetchInterval: options?.refetchInterval,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
      enabled: options?.enabled !== undefined ? options.enabled : true
    });
  };

  const createPayRun = useMutation({
    mutationFn: async ({
      payPeriodId,
      name,
      locationId,
      onlyUnpaid = false
    }: {
      payPeriodId: string;
      name: string;
      locationId?: string;
      onlyUnpaid?: boolean;
    }) => {
      return payRunService.createPayRun(payPeriodId, name, locationId, onlyUnpaid);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pay-runs'] });
    }
  });

  const updatePayRunStatus = useMutation({
    mutationFn: async ({
      payRunId,
      status
    }: {
      payRunId: string;
      status: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled';
    }) => {
      return payRunService.updatePayRunStatus(payRunId, status);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pay-runs'] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-details', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-summary', data.id] });
    }
  });

  const addAdjustment = useMutation({
    mutationFn: async ({
      payRunId,
      adjustment
    }: {
      payRunId: string;
      adjustment: AdjustmentData;
    }) => {
      return payRunService.addAdjustment(payRunId, adjustment);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pay-run-details', data.pay_run_id] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-summary', data.pay_run_id] });
    }
  });

  const deleteAdjustment = useMutation({
    mutationFn: async (adjustmentId: string) => {
      return payRunService.deleteAdjustment(adjustmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-run-details'] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-summary'] });
    }
  });  const processPayments = useMutation({
    mutationFn: async ({
      payRunId,
      employeeIds
    }: {
      payRunId: string;
      employeeIds: string[];
    }) => {
      if (!employeeIds.length) {
        throw new Error('No employees selected for payment');
      }
      return payRunService.processPayments(payRunId, employeeIds);
    },
    onSuccess: (_, variables) => {
      // Force refresh affected queries
      queryClient.invalidateQueries({ queryKey: ['pay-runs'] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-details', variables.payRunId] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-summary', variables.payRunId] });
      
      // Force refresh employee-specific queries
      variables.employeeIds.forEach(employeeId => {
        queryClient.invalidateQueries({ queryKey: ['employee-payments', employeeId] });
      });
    }
  });
  const recalculateCommissions = useMutation({
    mutationFn: async (payRunId: string) => {
      const result = await payRunService.recalculateCommissions(payRunId);
      console.log('Commission recalculation completed, result:', result);
      return result;
    },
    onSuccess: (_, payRunId) => {
      console.log('Invalidating queries after commission recalculation for pay run:', payRunId);
      
      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: ['pay-run-details', payRunId] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-summary', payRunId] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-employee-summaries', payRunId] });
      
      // Invalidate broader queries to ensure UI refresh
      queryClient.invalidateQueries({ queryKey: ['pay-run-employees'] });
      
      // Force refetch of the pay run details
      queryClient.refetchQueries({ queryKey: ['pay-run-details', payRunId] });
      queryClient.refetchQueries({ queryKey: ['pay-run-employee-summaries', payRunId] });
    }
  });

  // Fetch employee summaries for a pay run using optimized SQL function
  const usePayRunEmployeeSummaries = (payRunId: string) => {
    return useQuery({
      queryKey: ['pay-run-employee-summaries', payRunId],
      queryFn: async () => {
        if (!payRunId) return {};
        
        // Get summaries by employee using the SQL function
        const { data, error } = await supabase.rpc('calculate_employee_pay_run_summaries', { 
          pay_run_id_param: payRunId 
        });
        
        if (error) {
          console.error('Error fetching employee pay run summaries:', error);
          throw error;
        }
        
        // Convert array to record indexed by employee_id
        const summariesByEmployee = data?.reduce((acc: Record<string, any>, summary: any) => {
          acc[summary.employee_id] = {
            earnings: summary.earnings || 0,
            other: summary.other || 0,
            total: summary.total || 0,
            paid: summary.paid || 0,
            toPay: summary.toPay || 0
          };
          return acc;
        }, {});
        
        return summariesByEmployee || {};
      },
      enabled: !!payRunId
    });
  };
  
  return {
    // Original functions
    useEmployeeCompensation,
    addEmployeeCompensation,
    useClosedPeriods,
    addClosedPeriod,
    updateClosedPeriod,
    deleteClosedPeriod,
    
    // Pay Period functions
    usePayPeriods,
    createPayPeriod,
    archivePayPeriod,
    generateNextPayPeriod,
    
    // Pay Run functions
    usePayRuns,
    usePayRunDetails,
    usePayRunSummary,
    createPayRun,
    updatePayRunStatus,
    addAdjustment,
    deleteAdjustment,
    processPayments,
    recalculateCommissions,
    usePayRunEmployeeSummaries,
  };
}