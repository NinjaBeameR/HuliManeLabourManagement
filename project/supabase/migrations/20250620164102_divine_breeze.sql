/*
  # Hulimane Labour Management Database Schema

  1. New Tables
    - `workers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `address` (text)
      - `phone` (text, unique)
      - `opening_balance` (decimal, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, required)
      - `created_at` (timestamp)
    
    - `subcategories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `name` (text, required)
      - `created_at` (timestamp)
    
    - `attendance_records`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, foreign key)
      - `date` (date, required)
      - `status` (enum: present, absent, halfday)
      - `category_id` (uuid, foreign key)
      - `subcategory_id` (uuid, foreign key)
      - `amount` (decimal)
      - `narration` (text)
      - `created_at` (timestamp)
    
    - `payments`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, foreign key)
      - `amount` (decimal, required)
      - `date` (date, required)
      - `payment_mode` (text, required)
      - `narration` (text)
      - `created_at` (timestamp)
    
    - `balance_audit`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, foreign key)
      - `old_balance` (decimal)
      - `new_balance` (decimal)
      - `change_reason` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create enum for attendance status
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'halfday');

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text UNIQUE,
  opening_balance decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
  date date NOT NULL,
  status attendance_status NOT NULL,
  category_id uuid REFERENCES categories(id),
  subcategory_id uuid REFERENCES subcategories(id),
  amount decimal(10,2),
  narration text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, date)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL,
  payment_mode text NOT NULL,
  narration text,
  created_at timestamptz DEFAULT now()
);

-- Balance audit table
CREATE TABLE IF NOT EXISTS balance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
  old_balance decimal(10,2),
  new_balance decimal(10,2),
  change_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_audit ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - adjust based on auth requirements)
CREATE POLICY "Allow all operations on workers" ON workers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on subcategories" ON subcategories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on attendance_records" ON attendance_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on balance_audit" ON balance_audit FOR ALL TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance_records(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_worker_date ON payments(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_balance_audit_worker ON balance_audit(worker_id, created_at);

-- Function to update worker balance
CREATE OR REPLACE FUNCTION calculate_worker_balance(worker_uuid uuid)
RETURNS decimal(10,2) AS $$
DECLARE
  opening_bal decimal(10,2);
  total_wages decimal(10,2);
  total_payments decimal(10,2);
  current_balance decimal(10,2);
BEGIN
  -- Get opening balance
  SELECT opening_balance INTO opening_bal FROM workers WHERE id = worker_uuid;
  opening_bal := COALESCE(opening_bal, 0);
  
  -- Calculate total wages
  SELECT COALESCE(SUM(amount), 0) INTO total_wages 
  FROM attendance_records 
  WHERE worker_id = worker_uuid AND status IN ('present', 'halfday');
  
  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0) INTO total_payments 
  FROM payments 
  WHERE worker_id = worker_uuid;
  
  -- Calculate current balance
  current_balance := opening_bal + total_wages - total_payments;
  
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workers table
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();