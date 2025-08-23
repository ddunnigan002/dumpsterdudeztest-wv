-- Create test user for development
-- Note: This user will need to be created in Supabase Auth as well
-- You can do this through the Supabase dashboard or by running the signup process once

-- First, let's ensure we have a test franchise
INSERT INTO franchises (name, owner_email, phone, created_at, updated_at)
VALUES (
  'Dumpster Dudez - Test Location',
  'admin@dumpsterdudez.com',
  '555-0123',
  NOW(),
  NOW()
) ON CONFLICT (owner_email) DO NOTHING;

-- Get the franchise ID for the test user
DO $$
DECLARE
    test_franchise_id UUID;
BEGIN
    SELECT id INTO test_franchise_id 
    FROM franchises 
    WHERE owner_email = 'admin@dumpsterdudez.com';
    
    -- Insert test user profile (the auth user will be created when they first sign up)
    -- This is a placeholder that will be updated when the auth user is created
    INSERT INTO users (
        id, 
        franchise_id, 
        email, 
        full_name, 
        role, 
        phone, 
        created_at, 
        updated_at
    ) VALUES (
        gen_random_uuid(), -- Temporary ID, will be replaced when auth user is created
        test_franchise_id,
        'admin@dumpsterdudez.com',
        'Test Admin',
        'owner',
        '555-0123',
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        updated_at = NOW();
        
    -- Add some test vehicles for the test franchise
    INSERT INTO vehicles (
        franchise_id,
        vehicle_number,
        make,
        model,
        year,
        vin,
        license_plate,
        current_mileage,
        status,
        created_at,
        updated_at
    ) VALUES 
    (
        test_franchise_id,
        'DD-001',
        'Ford',
        'F-550',
        2022,
        '1FDUF5HT8NEC12345',
        'DD001NY',
        15000,
        'active',
        NOW(),
        NOW()
    ),
    (
        test_franchise_id,
        'DD-002', 
        'Chevrolet',
        'Silverado 3500',
        2021,
        '1GC4K0CY8MF123456',
        'DD002NY',
        22000,
        'active',
        NOW(),
        NOW()
    ) ON CONFLICT (franchise_id, vehicle_number) DO NOTHING;
    
END $$;
