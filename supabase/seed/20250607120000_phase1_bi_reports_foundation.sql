-- Phase 1: Foundation Database Changes for BI Reports
-- Missing Profile Fields Addition
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Performance indexes for existing and new fields
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_last_used ON profiles(last_used);
CREATE INDEX IF NOT EXISTS idx_profiles_visit_count ON profiles(visit_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer_id ON profiles(referrer_id);

-- Cache table for customer analytics
CREATE TABLE IF NOT EXISTS cache_customer_analytics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_appointments INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    avg_appointment_value DECIMAL(10,2) DEFAULT 0.00,
    last_appointment_date TIMESTAMP WITH TIME ZONE,
    segment TEXT DEFAULT 'new' CHECK (segment IN ('new', 'regular', 'vip', 'at_risk', 'lost')),
    favorite_service_id UUID,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Daily metrics cache for dashboard performance
CREATE TABLE IF NOT EXISTS cache_daily_metrics (
    metric_date DATE NOT NULL,
    location_id UUID,
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date, location_id)
);

-- Service performance cache
CREATE TABLE IF NOT EXISTS cache_service_performance (
    id SERIAL PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
    location_id UUID,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, month_year, location_id)
);

-- Employee performance cache
CREATE TABLE IF NOT EXISTS cache_employee_performance (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
    location_id UUID,
    total_appointments INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    punctuality_score DECIMAL(5,2) DEFAULT 0.00,
    utilization_rate DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month_year, location_id)
);

-- Performance indexes for cache tables
CREATE INDEX IF NOT EXISTS idx_cache_customer_analytics_customer_id ON cache_customer_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_cache_customer_analytics_segment ON cache_customer_analytics(segment);
CREATE INDEX IF NOT EXISTS idx_cache_customer_analytics_last_updated ON cache_customer_analytics(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_cache_daily_metrics_date ON cache_daily_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_cache_daily_metrics_location ON cache_daily_metrics(location_id);
CREATE INDEX IF NOT EXISTS idx_cache_service_performance_service_month ON cache_service_performance(service_id, month_year);
CREATE INDEX IF NOT EXISTS idx_cache_employee_performance_employee_month ON cache_employee_performance(employee_id, month_year);

-- Trigger function to update customer analytics cache
CREATE OR REPLACE FUNCTION update_customer_analytics_cache()
RETURNS TRIGGER AS $$
DECLARE
    customer_data RECORD;
    segment_type TEXT;
BEGIN
    -- Get customer statistics
    SELECT 
        COUNT(*) as appointment_count,
        COALESCE(SUM(final_total), 0) as total_spent,
        COALESCE(AVG(final_total), 0) as avg_value,
        MAX(appointment_date) as last_visit
    INTO customer_data
    FROM appointments 
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status = 'completed';
    
    -- Determine customer segment
    IF customer_data.appointment_count = 0 THEN
        segment_type := 'new';
    ELSIF customer_data.appointment_count >= 10 AND customer_data.avg_value > 100 THEN
        segment_type := 'vip';
    ELSIF customer_data.last_visit < NOW() - INTERVAL '6 months' THEN
        segment_type := 'lost';
    ELSIF customer_data.last_visit < NOW() - INTERVAL '3 months' THEN
        segment_type := 'at_risk';
    ELSE
        segment_type := 'regular';
    END IF;
    
    -- Update cache
    INSERT INTO cache_customer_analytics (
        customer_id, total_appointments, total_spent, 
        avg_appointment_value, last_appointment_date, segment, last_updated
    )
    VALUES (
        COALESCE(NEW.customer_id, OLD.customer_id),
        customer_data.appointment_count,
        customer_data.total_spent,
        customer_data.avg_value,
        customer_data.last_visit,
        segment_type,
        NOW()
    )
    ON CONFLICT (customer_id) 
    DO UPDATE SET
        total_appointments = EXCLUDED.total_appointments,
        total_spent = EXCLUDED.total_spent,
        avg_appointment_value = EXCLUDED.avg_appointment_value,
        last_appointment_date = EXCLUDED.last_appointment_date,
        segment = EXCLUDED.segment,
        last_updated = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update daily metrics cache
CREATE OR REPLACE FUNCTION update_daily_metrics_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_location UUID;
BEGIN
    target_date := DATE(COALESCE(NEW.appointment_date, OLD.appointment_date));
    target_location := COALESCE(NEW.location::UUID, OLD.location::UUID);
    
    -- Recalculate daily metrics for the affected date
    INSERT INTO cache_daily_metrics (
        metric_date, location_id, total_appointments, completed_appointments, 
        cancelled_appointments, total_revenue, new_customers, returning_customers
    )
    SELECT 
        target_date,
        target_location,
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
        COALESCE(SUM(final_total) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id IN (
                SELECT customer_id FROM appointments 
                WHERE customer_id = appointments.customer_id 
                AND DATE(appointment_date) = target_date
                AND appointment_date = (
                    SELECT MIN(appointment_date) 
                    FROM appointments a2 
                    WHERE a2.customer_id = appointments.customer_id
                )
            )
        ) as new_customers,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id NOT IN (
                SELECT customer_id FROM appointments 
                WHERE customer_id = appointments.customer_id 
                AND DATE(appointment_date) = target_date
                AND appointment_date = (
                    SELECT MIN(appointment_date) 
                    FROM appointments a2 
                    WHERE a2.customer_id = appointments.customer_id
                )
            )
        ) as returning_customers
    FROM appointments
    WHERE DATE(appointment_date) = target_date
    AND location::UUID = target_location
    GROUP BY target_date, target_location
    ON CONFLICT (metric_date, location_id)
    DO UPDATE SET
        total_appointments = EXCLUDED.total_appointments,
        completed_appointments = EXCLUDED.completed_appointments,
        cancelled_appointments = EXCLUDED.cancelled_appointments,
        total_revenue = EXCLUDED.total_revenue,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        last_updated = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_customer_analytics ON appointments;
CREATE TRIGGER trigger_update_customer_analytics
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_analytics_cache();

DROP TRIGGER IF EXISTS trigger_update_daily_metrics ON appointments;
CREATE TRIGGER trigger_update_daily_metrics
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_metrics_cache();
