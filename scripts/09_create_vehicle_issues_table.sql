-- Create vehicle_issues table for issue reporting
CREATE TABLE IF NOT EXISTS vehicle_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_issues_vehicle_id ON vehicle_issues(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_issues_status ON vehicle_issues(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_issues_reported_date ON vehicle_issues(reported_date);

-- Add some sample data for testing
INSERT INTO vehicle_issues (vehicle_id, description, status, reported_date) 
SELECT 
  v.id,
  'PTO needs service - not engaging properly',
  'open',
  '2024-01-08'
FROM vehicles v 
WHERE v.vehicle_number = 'CHEVY'
ON CONFLICT DO NOTHING;
