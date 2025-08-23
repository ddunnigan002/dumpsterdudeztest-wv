-- Ensure the correct vehicles exist in the database
-- Creating vehicles with proper vehicle_number values that match the app

-- First, delete any existing vehicles to avoid conflicts
DELETE FROM maintenance_records WHERE vehicle_id IN (SELECT id FROM vehicles);
DELETE FROM scheduled_maintenance WHERE vehicle_id IN (SELECT id FROM vehicles);
DELETE FROM daily_logs WHERE vehicle_id IN (SELECT id FROM vehicles);
DELETE FROM daily_checklists WHERE vehicle_id IN (SELECT id FROM vehicles);
DELETE FROM vehicle_issues WHERE vehicle_id IN (SELECT id FROM vehicles);
DELETE FROM vehicles;

-- Insert the correct vehicles
INSERT INTO vehicles (
  vehicle_number,
  make,
  model,
  year,
  license_plate,
  vin,
  current_mileage,
  status,
  franchise_id
) VALUES 
(
  'CHEVY',
  'Chevrolet',
  '6500',
  2020,
  'DD-001',
  '1GBJC34K0YE123456',
  82500,
  'active',
  (SELECT id FROM franchises WHERE name = 'Dumpster Dudez' LIMIT 1)
),
(
  'KENWORTH',
  'Kenworth',
  'T280',
  2019,
  'DD-002',
  '1XKAD49X0KJ123456',
  95000,
  'active',
  (SELECT id FROM franchises WHERE name = 'Dumpster Dudez' LIMIT 1)
);

-- Add scheduled maintenance for the Chevy (oil change due tomorrow and PTO service)
INSERT INTO scheduled_maintenance (
  vehicle_id,
  maintenance_type,
  due_date,
  due_mileage,
  completed
) VALUES 
(
  (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
  'Oil Change',
  CURRENT_DATE + INTERVAL '1 day',
  NULL,
  false
),
(
  (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
  'PTO Service',
  NULL,
  85000,
  false
),
(
  (SELECT id FROM vehicles WHERE vehicle_number = 'KENWORTH'),
  'Brake Inspection',
  CURRENT_DATE + INTERVAL '30 days',
  NULL,
  false
);
