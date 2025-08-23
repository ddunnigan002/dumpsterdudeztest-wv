-- Create settings tables for manager configuration

-- Company settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  company_logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#f97316', -- Orange theme
  secondary_color VARCHAR(7) DEFAULT '#1f2937', -- Dark gray
  business_hours_start TIME DEFAULT '08:00:00',
  business_hours_end TIME DEFAULT '17:00:00',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  daily_reminder_enabled BOOLEAN DEFAULT true,
  daily_reminder_time TIME DEFAULT '07:00:00',
  weekly_reminder_enabled BOOLEAN DEFAULT true,
  weekly_reminder_day INTEGER DEFAULT 1, -- Monday
  weekly_reminder_time TIME DEFAULT '08:00:00',
  monthly_reminder_enabled BOOLEAN DEFAULT true,
  monthly_reminder_day INTEGER DEFAULT 1, -- 1st of month
  monthly_reminder_time TIME DEFAULT '09:00:00',
  sms_notifications_enabled BOOLEAN DEFAULT false,
  email_notifications_enabled BOOLEAN DEFAULT true,
  emergency_contact_phone VARCHAR(20),
  overdue_task_escalation_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance schedule settings table
CREATE TABLE IF NOT EXISTS maintenance_schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  daily_checklist_required BOOLEAN DEFAULT true,
  weekly_checklist_interval_days INTEGER DEFAULT 7,
  monthly_checklist_interval_days INTEGER DEFAULT 30,
  oil_change_mileage_interval INTEGER DEFAULT 5000,
  tire_rotation_mileage_interval INTEGER DEFAULT 7500,
  brake_inspection_mileage_interval INTEGER DEFAULT 15000,
  annual_inspection_required BOOLEAN DEFAULT true,
  custom_maintenance_items JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System preferences table
CREATE TABLE IF NOT EXISTS system_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  data_retention_days INTEGER DEFAULT 365,
  auto_archive_completed_tasks BOOLEAN DEFAULT true,
  require_photos_for_issues BOOLEAN DEFAULT true,
  allow_offline_mode BOOLEAN DEFAULT true,
  default_vehicle_status VARCHAR(20) DEFAULT 'active',
  report_export_format VARCHAR(10) DEFAULT 'pdf',
  dashboard_refresh_interval_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_settings_franchise_id ON company_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_franchise_id ON notification_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_settings_franchise_id ON maintenance_schedule_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_system_preferences_franchise_id ON system_preferences(franchise_id);

-- Insert default settings for existing franchises
INSERT INTO company_settings (franchise_id, company_name)
SELECT id, name FROM franchises 
WHERE id NOT IN (SELECT franchise_id FROM company_settings WHERE franchise_id IS NOT NULL);

INSERT INTO notification_settings (franchise_id)
SELECT id FROM franchises 
WHERE id NOT IN (SELECT franchise_id FROM notification_settings WHERE franchise_id IS NOT NULL);

INSERT INTO maintenance_schedule_settings (franchise_id)
SELECT id FROM franchises 
WHERE id NOT IN (SELECT franchise_id FROM maintenance_schedule_settings WHERE franchise_id IS NOT NULL);

INSERT INTO system_preferences (franchise_id)
SELECT id FROM franchises 
WHERE id NOT IN (SELECT franchise_id FROM system_preferences WHERE franchise_id IS NOT NULL);
