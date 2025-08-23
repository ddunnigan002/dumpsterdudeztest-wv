-- Create audit_log table for tracking manager overrides and data changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by_user_id UUID REFERENCES users(id),
    manager_override BOOLEAN DEFAULT FALSE,
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_manager_override ON audit_log(manager_override);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by_user_id);

-- Add manager_override column to existing tables if not exists
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS manager_override BOOLEAN DEFAULT FALSE;
ALTER TABLE vehicle_issues ADD COLUMN IF NOT EXISTS manager_override BOOLEAN DEFAULT FALSE;
ALTER TABLE vehicle_issues ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Update existing records to have manager_override = false
UPDATE daily_logs SET manager_override = FALSE WHERE manager_override IS NULL;
UPDATE vehicle_issues SET manager_override = FALSE WHERE manager_override IS NULL;
