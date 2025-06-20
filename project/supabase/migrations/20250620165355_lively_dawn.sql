/*
  # Update RLS policies for anonymous access

  1. Policy Updates
    - Update all existing policies to allow both authenticated and anonymous users
    - This enables the application to work without requiring user authentication
    - Policies updated for: workers, categories, subcategories, attendance_records, payments, balance_audit

  2. Security Notes
    - This configuration allows anonymous access to all operations
    - Consider implementing proper authentication for production use
    - Current setup is suitable for single-user or internal applications
*/

-- Update workers table policy
DROP POLICY IF EXISTS "Allow all operations on workers" ON workers;
CREATE POLICY "Allow all operations on workers"
  ON workers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update categories table policy
DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
CREATE POLICY "Allow all operations on categories"
  ON categories
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update subcategories table policy
DROP POLICY IF EXISTS "Allow all operations on subcategories" ON subcategories;
CREATE POLICY "Allow all operations on subcategories"
  ON subcategories
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update attendance_records table policy
DROP POLICY IF EXISTS "Allow all operations on attendance_records" ON attendance_records;
CREATE POLICY "Allow all operations on attendance_records"
  ON attendance_records
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update payments table policy
DROP POLICY IF EXISTS "Allow all operations on payments" ON payments;
CREATE POLICY "Allow all operations on payments"
  ON payments
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update balance_audit table policy
DROP POLICY IF EXISTS "Allow all operations on balance_audit" ON balance_audit;
CREATE POLICY "Allow all operations on balance_audit"
  ON balance_audit
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);