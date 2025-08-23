-- Create scheduled_maintenance table
CREATE TABLE IF NOT EXISTS scheduled_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    due_mileage INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_maintenance_vehicle_id ON scheduled_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_maintenance_completed ON scheduled_maintenance(completed);

-- Insert sample scheduled maintenance for Chevy (oil change due tomorrow and PTO service)
INSERT INTO scheduled_maintenance (vehicle_id, maintenance_type, description, due_date, due_mileage, completed)
SELECT 
    v.id,
    'Oil Change',
    'Regular oil change service',
    CURRENT_DATE + INTERVAL '1 day', -- Due tomorrow
    NULL,
    FALSE
FROM vehicles v 
WHERE v.vehicle_number = 'CHEVY'
ON CONFLICT DO NOTHING;

INSERT INTO scheduled_maintenance (vehicle_id, maintenance_type, description, due_date, due_mileage, completed)
SELECT 
    v.id,
    'PTO Service',
    'Power Take-Off system needs service',
    CURRENT_DATE + INTERVAL '7 days', -- Due next week
    NULL,
    FALSE
FROM vehicles v 
WHERE v.vehicle_number = 'CHEVY'
ON CONFLICT DO NOTHING;

-- Insert sample scheduled maintenance for Kenworth (brake inspection)
INSERT INTO scheduled_maintenance (vehicle_id, maintenance_type, description, due_date, due_mileage, completed)
SELECT 
    v.id,
    'Brake Inspection',
    'Annual brake system inspection',
    CURRENT_DATE + INTERVAL '30 days', -- Due in 30 days
    NULL,
    FALSE
FROM vehicles v 
WHERE v.vehicle_number = 'KENWORTH'
ON CONFLICT DO NOTHING;
