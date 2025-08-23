-- Fleet Maintenance Database Schema
-- This script creates all the necessary tables for the fleet maintenance app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Franchises table (multi-tenant support)
CREATE TABLE franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (drivers, managers, franchise owners)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'driver')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    vin VARCHAR(17) UNIQUE,
    license_plate VARCHAR(20),
    current_mileage INTEGER DEFAULT 0,
    purchase_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(franchise_id, vehicle_number)
);

-- Maintenance templates (preventive maintenance schedules)
CREATE TABLE maintenance_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('mileage', 'time', 'both')),
    mileage_interval INTEGER, -- miles between services
    time_interval_days INTEGER, -- days between services
    estimated_cost DECIMAL(10,2),
    estimated_hours DECIMAL(4,2),
    parts_needed TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance records (historical log)
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES maintenance_templates(id),
    performed_by_user_id UUID REFERENCES users(id),
    service_date DATE NOT NULL,
    mileage_at_service INTEGER NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('preventive', 'repair', 'inspection', 'other')),
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    labor_hours DECIMAL(4,2),
    parts_used TEXT,
    vendor_name VARCHAR(255),
    next_service_date DATE,
    next_service_mileage INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily vehicle logs (driver entries)
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL,
    start_mileage INTEGER NOT NULL,
    end_mileage INTEGER NOT NULL,
    fuel_added DECIMAL(6,2),
    fuel_cost DECIMAL(8,2),
    issues_reported TEXT,
    photos TEXT[], -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, log_date)
);

-- Daily checklists (driver pre-trip inspections)
CREATE TABLE daily_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    checklist_date DATE NOT NULL,
    -- Checklist items (boolean fields)
    tires_condition BOOLEAN DEFAULT false,
    lights_working BOOLEAN DEFAULT false,
    brakes_working BOOLEAN DEFAULT false,
    fluid_levels_ok BOOLEAN DEFAULT false,
    mirrors_clean BOOLEAN DEFAULT false,
    safety_equipment_present BOOLEAN DEFAULT false,
    -- Overall status
    overall_status VARCHAR(20) DEFAULT 'pending' CHECK (overall_status IN ('pass', 'fail', 'pending')),
    notes TEXT,
    signature_url TEXT, -- URL to driver signature image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, checklist_date)
);

-- Create indexes for better performance
CREATE INDEX idx_vehicles_franchise_id ON vehicles(franchise_id);
CREATE INDEX idx_users_franchise_id ON users(franchise_id);
CREATE INDEX idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_records_service_date ON maintenance_records(service_date);
CREATE INDEX idx_daily_logs_vehicle_id ON daily_logs(vehicle_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX idx_daily_checklists_vehicle_id ON daily_checklists(vehicle_id);
CREATE INDEX idx_daily_checklists_date ON daily_checklists(checklist_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
