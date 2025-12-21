-- Create checklist settings table for customizable checklist configurations
CREATE TABLE IF NOT EXISTS checklist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  checklist_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  due_day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday, 4 = Thursday)
  due_day_of_month INTEGER, -- 1-31 for monthly
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(franchise_id, checklist_type)
);

-- Create checklist items table for customizable checklist items
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  checklist_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  item_name VARCHAR(255) NOT NULL,
  item_label VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO checklist_settings (franchise_id, checklist_type, due_day_of_week, due_day_of_month)
VALUES 
  (NULL, 'weekly', 4, NULL),  -- Thursday
  (NULL, 'monthly', NULL, 1)  -- 1st of month
ON CONFLICT (franchise_id, checklist_type) DO NOTHING;

-- Insert default checklist items for daily
INSERT INTO checklist_items (franchise_id, checklist_type, item_name, item_label, display_order) VALUES
  (NULL, 'daily', 'lights_working', 'Lights Working', 1),
  (NULL, 'daily', 'brakes_working', 'Brakes Working', 2),
  (NULL, 'daily', 'tires_condition', 'Tires Condition Good', 3),
  (NULL, 'daily', 'fluid_levels_ok', 'Fluid Levels OK', 4),
  (NULL, 'daily', 'mirrors_clean', 'Mirrors Clean & Adjusted', 5),
  (NULL, 'daily', 'safety_equipment_present', 'Safety Equipment Present', 6);

-- Insert default checklist items for weekly
INSERT INTO checklist_items (franchise_id, checklist_type, item_name, item_label, display_order) VALUES
  (NULL, 'weekly', 'grease_chassis_points', 'Grease Chassis Points', 1),
  (NULL, 'weekly', 'inspect_hydraulic_filter', 'Inspect Hydraulic Filter', 2),
  (NULL, 'weekly', 'wash_truck_clean_cab', 'Wash Truck & Clean Cab', 3),
  (NULL, 'weekly', 'engine_oil', 'Check Engine Oil', 4),
  (NULL, 'weekly', 'transmission_fluid', 'Check Transmission Fluid', 5),
  (NULL, 'weekly', 'antifreeze', 'Check Antifreeze', 6),
  (NULL, 'weekly', 'windshield_fluid', 'Check Windshield Fluid', 7);

-- Insert default checklist items for monthly
INSERT INTO checklist_items (franchise_id, checklist_type, item_name, item_label, display_order) VALUES
  (NULL, 'monthly', 'change_engine_oil', 'Change Engine Oil & Filter', 1),
  (NULL, 'monthly', 'replace_air_filter', 'Replace Air Filter', 2),
  (NULL, 'monthly', 'inspect_brake_system', 'Inspect Brake System', 3),
  (NULL, 'monthly', 'check_differential_fluid', 'Check Differential Fluid', 4),
  (NULL, 'monthly', 'change_hydraulic_filter', 'Change Hydraulic Filter', 5),
  (NULL, 'monthly', 'test_block_heater', 'Test Block Heater', 6),
  (NULL, 'monthly', 'clean_radiator_fins', 'Clean Radiator Fins', 7),
  (NULL, 'monthly', 'inspect_frame_rails', 'Inspect Frame Rails', 8);
