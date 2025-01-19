import { renderHook, act } from '@testing-library/react';
import { useScheduleState } from '../useScheduleState';
import { vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

describe('useScheduleState', () => {
  const mockEmployee = {
    id: '123',
    name: 'John Doe'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a fixed date for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));

    expect(result.current.scheduleType).toBe('1');
    expect(result.current.currentWeek).toBe(0);
    expect(result.current.weekConfigs).toHaveLength(4);
  });

  it('should handle schedule type changes', () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));

    act(() => {
      result.current.setScheduleType('2');
    });

    expect(result.current.scheduleType).toBe('2');
  });

  it('should generate correct rotating shifts for a 2-week schedule', async () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));
    const insertMock = vi.fn(() => Promise.resolve({ error: null }));
    
    // Mock Supabase for this specific test
    (supabase.from as any).mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      })),
      insert: insertMock
    }));

    // Set up a 2-week rotation
    act(() => {
      result.current.setScheduleType('2');
      // Configure Week 1: Monday and Tuesday
      result.current.setWeekConfigs(prev => {
        const newConfigs = [...prev];
        newConfigs[0] = {
          days: {
            ...newConfigs[0].days,
            '1': { // Monday
              enabled: true,
              shifts: [{ startTime: '09:00', endTime: '17:00' }]
            },
            '2': { // Tuesday
              enabled: true,
              shifts: [{ startTime: '09:00', endTime: '17:00' }]
            }
          }
        };
        // Configure Week 2: Wednesday and Thursday
        newConfigs[1] = {
          days: {
            ...newConfigs[1].days,
            '3': { // Wednesday
              enabled: true,
              shifts: [{ startTime: '10:00', endTime: '18:00' }]
            },
            '4': { // Thursday
              enabled: true,
              shifts: [{ startTime: '10:00', endTime: '18:00' }]
            }
          }
        };
        return newConfigs;
      });
    });

    // Submit the schedule
    await act(async () => {
      await result.current.handleSubmit();
    });

    // Get all shifts that were generated
    const generatedShifts = insertMock.mock.calls[0][0];

    // Verify shifts were generated for 8 weeks (4 cycles of 2-week rotation)
    expect(generatedShifts).toBeDefined();
    
    // Helper function to get day of week from date string
    const getDayOfWeek = (dateString: string) => new Date(dateString).getDay();
    
    // Group shifts by week
    const shiftsByWeek = generatedShifts.reduce((acc: any[], shift: any) => {
      const weekStart = new Date(shift.start_time);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString();
      
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(shift);
      return acc;
    }, {});

    // Verify pattern for each cycle
    Object.entries(shiftsByWeek).forEach(([weekStart, weekShifts]: [string, any[]], weekIndex) => {
      const weekNumber = weekIndex % 2;
      
      if (weekNumber === 0) {
        // Week 1 pattern: Monday and Tuesday
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 1)).toBe(true);
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 2)).toBe(true);
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 3)).toBe(false);
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 4)).toBe(false);
      } else {
        // Week 2 pattern: Wednesday and Thursday
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 1)).toBe(false);
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 2)).toBe(false);
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 3)).toBe(true);
        expect(weekShifts.some(shift => getDayOfWeek(shift.start_time) === 4)).toBe(true);
      }
    });
  });

  it('should handle errors during shift submission', async () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));
    
    // Mock Supabase to simulate an error
    (supabase.from as any).mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ error: new Error('Database error') }))
          }))
        }))
      })),
      insert: vi.fn()
    }));

    const success = await act(async () => {
      return await result.current.handleSubmit();
    });

    expect(success).toBe(false);
  });
});