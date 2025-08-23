-- Add weekly and monthly checklist tables

-- Weekly checklists table
CREATE TABLE weekly_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    checklist_date DATE NOT NULL,
    -- Weekly maintenance items
    grease_chassis_points BOOLEAN DEFAULT false,
    lubricate_hooklift_points BOOLEAN DEFAULT false,
    inspect_hydraulic_cylinders BOOLEAN DEFAULT false,
    inspect_hydraulic_filter BOOLEAN DEFAULT false,
    clean_battery_terminals BOOLEAN DEFAULT false,
    check_def_fluid BOOLEAN DEFAULT false,
    torque_wheel_lugs BOOLEAN DEFAULT false,
    inspect_tarp_straps BOOLEAN DEFAULT false,
    check_door_latches BOOLEAN DEFAULT false,
    wash_truck_clean_cab BOOLEAN DEFAULT false,
    -- Overall status
    overall_status VARCHAR(20) DEFAULT 'pending' CHECK (overall_status IN ('pass', 'fail', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, checklist_date)
);

-- Monthly checklists table
CREATE TABLE monthly_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    checklist_date DATE NOT NULL,
    -- Monthly maintenance items
    change_engine_oil BOOLEAN DEFAULT false,
    replace_air_filter BOOLEAN DEFAULT false,
    inspect_brake_system BOOLEAN DEFAULT false,
    check_transmission_fluid BOOLEAN DEFAULT false,
    change_hydraulic_filter BOOLEAN DEFAULT false,
    check_differential_fluid BOOLEAN DEFAULT false,
    inspect_frame_rails BOOLEAN DEFAULT false,
    check_pto_operation BOOLEAN DEFAULT false,
    inspect_exhaust_system BOOLEAN DEFAULT false,
    test_block_heater BOOLEAN DEFAULT false,
    clean_radiator_fins BOOLEAN DEFAULT false,
    inspect_suspension_bushings BOOLEAN DEFAULT false,
    -- Overall status
    overall_status VARCHAR(20) DEFAULT 'pending' CHECK (overall_status IN ('pass', 'fail', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, checklist_date)
);

-- Create indexes for performance
CREATE INDEX idx_weekly_checklists_vehicle_id ON weekly_checklists(vehicle_id);
CREATE INDEX idx_weekly_checklists_date ON weekly_checklists(checklist_date);
CREATE INDEX idx_monthly_checklists_vehicle_id ON monthly_checklists(vehicle_id);
CREATE INDEX idx_monthly_checklists_date ON monthly_checklists(checklist_date);
