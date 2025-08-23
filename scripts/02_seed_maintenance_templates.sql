-- Seed common maintenance templates for dumpster rental trucks
INSERT INTO maintenance_templates (name, description, interval_type, mileage_interval, time_interval_days, estimated_cost, estimated_hours, parts_needed) VALUES
('Oil Change', 'Regular engine oil and filter change', 'mileage', 5000, NULL, 75.00, 0.5, 'Engine oil, oil filter'),
('Tire Rotation', 'Rotate tires for even wear', 'mileage', 10000, NULL, 50.00, 1.0, 'None'),
('Brake Inspection', 'Inspect brake pads, rotors, and fluid', 'mileage', 15000, NULL, 100.00, 1.5, 'Brake pads (if needed)'),
('Transmission Service', 'Change transmission fluid and filter', 'mileage', 30000, NULL, 200.00, 2.0, 'Transmission fluid, filter'),
('Annual DOT Inspection', 'Department of Transportation safety inspection', 'time', NULL, 365, 150.00, 2.0, 'Various (as needed)'),
('Hydraulic System Check', 'Inspect hydraulic lines and fluid for dump mechanism', 'time', NULL, 90, 125.00, 1.0, 'Hydraulic fluid'),
('Air Filter Replacement', 'Replace engine air filter', 'mileage', 12000, NULL, 25.00, 0.25, 'Air filter'),
('Coolant System Service', 'Flush and replace coolant', 'time', NULL, 730, 100.00, 1.5, 'Coolant, thermostat (if needed)'),
('Battery Test', 'Test battery and charging system', 'time', NULL, 180, 25.00, 0.5, 'Battery (if needed)'),
('Belts and Hoses Inspection', 'Check all belts and hoses for wear', 'mileage', 20000, NULL, 75.00, 1.0, 'Belts, hoses (if needed)');
