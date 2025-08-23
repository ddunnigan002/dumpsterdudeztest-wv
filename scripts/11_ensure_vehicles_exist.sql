-- Ensure the basic vehicles exist in the database
INSERT INTO vehicles (vehicle_number, make, model, year, license_plate, franchise_id) 
VALUES 
  ('CHEVY', 'Chevrolet', 'Silverado', 2020, 'CHV-001', '00000000-0000-0000-0000-000000000001'),
  ('KENWORTH', 'Kenworth', 'T880', 2019, 'KEN-001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (vehicle_number) DO NOTHING;
