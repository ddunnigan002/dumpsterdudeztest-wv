-- Update vehicles to match actual Dumpster Dudez fleet
-- Clear existing vehicles and add real ones
DELETE FROM vehicles WHERE franchise_id = (SELECT id FROM franchises WHERE name = 'Dumpster Dudez');

-- Insert the actual vehicles
INSERT INTO vehicles (id, franchise_id, vehicle_number, make, model, year, current_mileage, status, license_plate, vin, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 
   (SELECT id FROM franchises WHERE name = 'Dumpster Dudez'), 
   'CHEVY', 'Chevrolet', '6500', 2020, 45000, 'active', 'DD-001', 'CHEV123456789', NOW(), NOW()),
  (gen_random_uuid(), 
   (SELECT id FROM franchises WHERE name = 'Dumpster Dudez'), 
   'KENWORTH', 'Kenworth', 'T280', 2019, 62000, 'active', 'DD-002', 'KENW987654321', NOW(), NOW());

-- Add scheduled maintenance for oil change due tomorrow
INSERT INTO maintenance_records (id, vehicle_id, service_type, description, next_service_date, next_service_mileage, notes, created_at)
VALUES 
  (gen_random_uuid(),
   (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
   'Oil Change',
   'Regular oil and filter change',
   CURRENT_DATE + INTERVAL '1 day',
   46000,
   'Due tomorrow - scheduled maintenance',
   NOW());

-- Add pending PTO issue for Chevy
INSERT INTO maintenance_records (id, vehicle_id, service_type, description, notes, created_at)
VALUES 
  (gen_random_uuid(),
   (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
   'PTO Service',
   'PTO system needs service - reported issue',
   'Pending service scheduling for PTO malfunction',
   NOW());
