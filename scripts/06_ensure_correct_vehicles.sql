-- Create script to ensure correct vehicles exist in database
-- First, clear any existing vehicles to avoid conflicts
DELETE FROM vehicles;

-- Insert the correct vehicles for Dumpster Dudez
INSERT INTO vehicles (
  id,
  franchise_id,
  vehicle_number,
  make,
  model,
  year,
  current_mileage,
  status,
  license_plate,
  vin,
  purchase_date,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM franchises WHERE name = 'Dumpster Dudez' LIMIT 1),
  'CHEVY',
  'Chevrolet',
  '6500',
  2020,
  45000,
  'active',
  'DD-001',
  '1GBJC34K0RE123456',
  '2020-01-15',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM franchises WHERE name = 'Dumpster Dudez' LIMIT 1),
  'KENWORTH',
  'Kenworth',
  'T280',
  2019,
  62000,
  'active',
  'DD-002',
  '1XKAD49X0KJ654321',
  '2019-06-20',
  NOW(),
  NOW()
);

-- Add scheduled maintenance for the Chevy (oil change due tomorrow)
INSERT INTO scheduled_maintenance (
  id,
  vehicle_id,
  maintenance_type,
  due_date,
  due_mileage,
  priority,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
  'Oil Change',
  CURRENT_DATE + INTERVAL '1 day',
  46000,
  'high',
  'Regular oil change service due',
  NOW()
);

-- Add PTO service issue for the Chevy
INSERT INTO vehicle_issues (
  id,
  vehicle_id,
  issue_type,
  description,
  priority,
  status,
  reported_date,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
  'mechanical',
  'PTO needs service - not engaging properly',
  'medium',
  'open',
  CURRENT_DATE - INTERVAL '2 days',
  NOW()
);
