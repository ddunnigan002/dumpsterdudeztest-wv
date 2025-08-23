-- Sample data for Dumpster Dudez franchise
INSERT INTO franchises (id, name, owner_email, phone, address) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Dumpster Dudez - Main Location', 'owner@dumpsterdudez.com', '555-123-4567', '123 Industrial Blvd, Your City, NY 12345');

-- Sample users
INSERT INTO users (franchise_id, email, full_name, role, phone) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'manager@dumpsterdudez.com', 'Mike Manager', 'manager', '555-234-5678'),
('550e8400-e29b-41d4-a716-446655440000', 'driver1@dumpsterdudez.com', 'Dave Driver', 'driver', '555-345-6789'),
('550e8400-e29b-41d4-a716-446655440000', 'driver2@dumpsterdudez.com', 'Dan Driver', 'driver', '555-456-7890');

-- Sample vehicles
INSERT INTO vehicles (franchise_id, vehicle_number, make, model, year, vin, license_plate, current_mileage, purchase_date, status) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'TRUCK-001', 'Ford', 'F-550', 2020, '1FDUF5HT5LEA12345', 'DD-001', 45000, '2020-03-15', 'active'),
('550e8400-e29b-41d4-a716-446655440000', 'TRUCK-002', 'Chevrolet', 'Silverado 3500HD', 2021, '1GC4K0CY8MF123456', 'DD-002', 32000, '2021-06-20', 'active');
