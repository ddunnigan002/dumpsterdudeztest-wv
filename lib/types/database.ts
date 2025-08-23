// Database type definitions for the fleet maintenance app

export interface Franchise {
  id: string
  name: string
  owner_email: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  franchise_id: string
  email: string
  full_name: string
  role: "owner" | "manager" | "driver"
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  franchise_id: string
  vehicle_number: string
  make: string
  model: string
  year: number
  vin?: string
  license_plate?: string
  current_mileage: number
  purchase_date?: string
  status: "active" | "maintenance" | "retired"
  notes?: string
  created_at: string
  updated_at: string
}

export interface MaintenanceTemplate {
  id: string
  name: string
  description?: string
  interval_type: "mileage" | "time" | "both"
  mileage_interval?: number
  time_interval_days?: number
  estimated_cost?: number
  estimated_hours?: number
  parts_needed?: string
  is_active: boolean
  created_at: string
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  template_id?: string
  performed_by_user_id?: string
  service_date: string
  mileage_at_service: number
  service_type: "preventive" | "repair" | "inspection" | "other"
  description: string
  cost?: number
  labor_hours?: number
  parts_used?: string
  vendor_name?: string
  next_service_date?: string
  next_service_mileage?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  vehicle_id: string
  driver_id: string
  log_date: string
  start_mileage: number
  end_mileage: number
  fuel_added?: number
  fuel_cost?: number
  issues_reported?: string
  photos?: string[]
  created_at: string
}

export interface DailyChecklist {
  id: string
  vehicle_id: string
  driver_id: string
  checklist_date: string
  tires_condition: boolean
  lights_working: boolean
  brakes_working: boolean
  fluid_levels_ok: boolean
  mirrors_clean: boolean
  safety_equipment_present: boolean
  overall_status: "pass" | "fail" | "pending"
  notes?: string
  signature_url?: string
  created_at: string
}
