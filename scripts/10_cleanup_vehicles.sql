-- Clean up vehicles table to only have the correct 2 trucks
-- Delete all existing vehicles first
DELETE FROM vehicles;

-- Insert only the correct 2 vehicles
INSERT INTO vehicles (
    id,
    vehicle_number,
    make,
    model,
    year,
    franchise_id,
    current_mileage,
    status,
    license_plate,
    vin,
    purchase_date,
    created_at,
    updated_at
) VALUES 
-- Chevy 6500
(
    gen_random_uuid(),
    'CHEVY',
    'Chevrolet',
    '6500',
    2018,
    (SELECT id FROM franchises WHERE name = 'Dumpster Dudez' LIMIT 1),
    84500,
    'active',
    'DD-001',
    '1GBJC34K8JE123456',
    '2018-03-15',
    NOW(),
    NOW()
),
-- Kenworth T280
(
    gen_random_uuid(),
    'KENWORTH',
    'Kenworth',
    'T280',
    2019,
    (SELECT id FROM franchises WHERE name = 'Dumpster Dudez' LIMIT 1),
    67200,
    'active',
    'DD-002',
    '1XKAD49X0KJ654321',
    '2019-07-22',
    NOW(),
    NOW()
);

-- Clean up any orphaned scheduled maintenance
DELETE FROM scheduled_maintenance WHERE vehicle_id NOT IN (SELECT id FROM vehicles);

-- Add the scheduled maintenance for the correct vehicles
INSERT INTO scheduled_maintenance (
    id,
    vehicle_id,
    maintenance_type,
    description,
    due_date,
    due_mileage,
    completed,
    created_at,
    updated_at
) VALUES
-- Oil change due tomorrow for Chevy
(
    gen_random_uuid(),
    (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
    'Oil Change',
    'Regular oil change and filter replacement',
    CURRENT_DATE + INTERVAL '1 day',
    85000,
    false,
    NOW(),
    NOW()
),
-- PTO service for Chevy
(
    gen_random_uuid(),
    (SELECT id FROM vehicles WHERE vehicle_number = 'CHEVY'),
    'PTO Service',
    'Power take-off system maintenance and inspection',
    NULL,
    85000,
    false,
    NOW(),
    NOW()
);
