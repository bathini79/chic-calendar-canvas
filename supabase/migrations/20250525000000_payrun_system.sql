-- Pay Runs System Migration
-- Created: 2025-05-25
-- This migration file creates the pay runs system with salary and compensation management

-- Create pay periods table
CREATE TABLE IF NOT EXISTS pay_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure start date is before end date
    CHECK (start_date <= end_date),
    -- Ensure periods don't overlap
    UNIQUE (start_date, end_date)
);

-- Create pay runs table
CREATE TABLE IF NOT EXISTS pay_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    paid_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    location_id UUID REFERENCES locations(id) -- Optional: for location-specific pay runs
);

-- Create pay run items table (individual payment items)
CREATE TABLE IF NOT EXISTS pay_run_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_run_id UUID NOT NULL REFERENCES pay_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    compensation_type TEXT NOT NULL CHECK (compensation_type IN ('commission', 'salary', 'tip', 'adjustment')),
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    source_id UUID, -- Reference to source (e.g., appointment, shift, etc.)
    source_type TEXT, -- Type of source (e.g., 'appointment', 'shift', 'manual')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create employee compensation settings table
CREATE TABLE IF NOT EXISTS employee_compensation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    base_amount NUMERIC(10,2) NOT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (employee_id, effective_from)
);
CREATE TABLE IF NOT EXISTS closed_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CHECK (start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS closed_periods_locations (
    closed_period_id UUID NOT NULL,
    location_id UUID NOT NULL,
    PRIMARY KEY (closed_period_id, location_id),
    FOREIGN KEY (closed_period_id) REFERENCES closed_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE closed_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_periods_locations ENABLE ROW LEVEL SECURITY;
-- Add leave_type to time_off_requests table
ALTER TABLE time_off_requests
ADD COLUMN IF NOT EXISTS leave_type TEXT NOT NULL DEFAULT 'paid' CHECK (leave_type IN ('paid', 'unpaid'));

-- Create trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_payrun_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
CREATE TRIGGER update_pay_periods_updated_at
BEFORE UPDATE ON pay_periods
FOR EACH ROW
EXECUTE FUNCTION update_payrun_updated_at_column();

CREATE TRIGGER update_pay_runs_updated_at
BEFORE UPDATE ON pay_runs
FOR EACH ROW
EXECUTE FUNCTION update_payrun_updated_at_column();

CREATE TRIGGER update_pay_run_items_updated_at
BEFORE UPDATE ON pay_run_items
FOR EACH ROW
EXECUTE FUNCTION update_payrun_updated_at_column();

CREATE TRIGGER update_employee_compensation_settings_updated_at
BEFORE UPDATE ON employee_compensation_settings
FOR EACH ROW
EXECUTE FUNCTION update_payrun_updated_at_column();

-- Function to calculate working days in a period
CREATE OR REPLACE FUNCTION calculate_working_days(
    start_date_param DATE,
    end_date_param DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_days INTEGER;
    holidays INTEGER;
BEGIN
    -- Calculate total days in period
    total_days := (end_date_param - start_date_param) + 1;
    
    -- Count holidays from closed_periods
    SELECT COUNT(DISTINCT date_day)
    INTO holidays
    FROM (
        SELECT generate_series(
            GREATEST(cp.start_date, start_date_param)::date, 
            LEAST(cp.end_date, end_date_param)::date, 
            '1 day'::interval
        )::date as date_day
        FROM closed_periods cp
        WHERE cp.start_date <= end_date_param
        AND cp.end_date >= start_date_param
    ) as holiday_days;
    
    -- Return working days (total days minus holidays)
    RETURN total_days - holidays;
END;
$$;

-- Function to calculate unpaid leave days for an employee in a period
CREATE OR REPLACE FUNCTION calculate_unpaid_leave_days(
    employee_id_param UUID,
    start_date_param DATE,
    end_date_param DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    unpaid_leave_days INTEGER := 0;
BEGIN
    -- Count unpaid leave days
    SELECT SUM(
        LEAST(tr.end_date, end_date_param) - 
        GREATEST(tr.start_date, start_date_param) + 1
    )
    INTO unpaid_leave_days
    FROM time_off_requests tr
    WHERE tr.employee_id = employee_id_param
    AND tr.status = 'approved'
    AND tr.leave_type = 'unpaid'
    AND tr.start_date <= end_date_param
    AND tr.end_date >= start_date_param;
    
    RETURN COALESCE(unpaid_leave_days, 0);
END;
$$;

-- Function to calculate salary for an employee in a period
CREATE OR REPLACE FUNCTION calculate_salary_for_period(
    employee_id_param UUID,
    start_date_param DATE,
    end_date_param DATE
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    base_amount NUMERIC(10,2);
    total_days INTEGER;
    unpaid_leave_days INTEGER;
    daily_rate NUMERIC(10,2);
    final_salary NUMERIC(10,2);
BEGIN
    -- Get employee's base salary
    SELECT ecs.base_amount 
    INTO base_amount
    FROM employee_compensation_settings ecs
    WHERE ecs.employee_id = employee_id_param
    AND (ecs.effective_to IS NULL OR ecs.effective_to >= start_date_param)
    AND ecs.effective_from <= end_date_param
    ORDER BY ecs.effective_from DESC
    LIMIT 1;
    
    -- If no compensation settings found, return 0
    IF base_amount IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate total days in period
    total_days := (end_date_param - start_date_param) + 1;
    
    -- Get unpaid leave days
    unpaid_leave_days := calculate_unpaid_leave_days(
        employee_id_param, 
        start_date_param, 
        end_date_param
    );
    
    -- Calculate daily rate (base monthly amount ÷ 30)
    daily_rate := base_amount / 30;
    
    -- Calculate final salary (monthly salary minus unpaid leave deductions)
    final_salary := base_amount - (daily_rate * unpaid_leave_days);
    
    RETURN final_salary;
END;
$$;

-- Function to populate pay run items for a pay run
CREATE OR REPLACE FUNCTION populate_pay_run_items(
    pay_run_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    pay_run_record RECORD;
    employee_record RECORD;
    salary_amount NUMERIC(10,2);
BEGIN
    -- Get pay run information
    SELECT pr.id, pr.pay_period_id, pp.start_date, pp.end_date, pr.location_id
    INTO pay_run_record
    FROM pay_runs pr
    JOIN pay_periods pp ON pr.pay_period_id = pp.id
    WHERE pr.id = pay_run_id_param;
    
    -- Process each active employee
    FOR employee_record IN 
        SELECT e.id
        FROM employees e
        WHERE e.status = 'active'
        AND (
            pay_run_record.location_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM employee_locations el 
                WHERE el.employee_id = e.id 
                AND el.location_id = pay_run_record.location_id
            )
        )
    LOOP
        -- Calculate salary
        salary_amount := calculate_salary_for_period(
            employee_record.id, 
            pay_run_record.start_date, 
            pay_run_record.end_date
        );
        
        -- Insert salary pay run item if amount > 0
        IF salary_amount > 0 THEN
            INSERT INTO pay_run_items (
                pay_run_id, 
                employee_id, 
                compensation_type, 
                amount,
                description
            ) VALUES (
                pay_run_id_param,
                employee_record.id,
                'salary',
                salary_amount,
                'Salary for period ' || pay_run_record.start_date || ' to ' || pay_run_record.end_date
            );
        END IF;
        
        -- Commission and other items would be handled in separate functions
    END LOOP;
END;
$$;