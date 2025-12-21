-- Make driver_id nullable in daily_logs since app doesn't use authentication
ALTER TABLE daily_logs 
ALTER COLUMN driver_id DROP NOT NULL;

-- Add comment explaining why it's nullable
COMMENT ON COLUMN daily_logs.driver_id IS 'Driver who completed the log. Nullable for apps without authentication.';
