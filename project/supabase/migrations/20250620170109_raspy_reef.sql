/*
  # Fix Balance Calculation Accuracy

  1. Database Function Updates
    - Fix calculate_worker_balance function to handle decimal precision properly
    - Ensure consistent data types and calculations
    - Add proper null handling and edge cases

  2. Improvements
    - Use COALESCE consistently for null handling
    - Ensure decimal precision is maintained throughout calculations
    - Add validation for edge cases
*/

-- Drop and recreate the balance calculation function with proper precision handling
DROP FUNCTION IF EXISTS calculate_worker_balance(uuid);

CREATE OR REPLACE FUNCTION calculate_worker_balance(worker_uuid uuid)
RETURNS decimal(10,2) AS $$
DECLARE
  opening_bal decimal(10,2) := 0;
  total_wages decimal(10,2) := 0;
  total_payments decimal(10,2) := 0;
  current_balance decimal(10,2) := 0;
BEGIN
  -- Validate input
  IF worker_uuid IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get opening balance with proper null handling
  SELECT COALESCE(opening_balance, 0)::decimal(10,2) 
  INTO opening_bal 
  FROM workers 
  WHERE id = worker_uuid;
  
  -- If worker doesn't exist, return 0
  IF opening_bal IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total wages from attendance records
  -- Only count wages for present and halfday status, exclude absent
  SELECT COALESCE(SUM(COALESCE(amount, 0)), 0)::decimal(10,2)
  INTO total_wages 
  FROM attendance_records 
  WHERE worker_id = worker_uuid 
    AND status IN ('present', 'halfday')
    AND amount IS NOT NULL
    AND amount > 0;
  
  -- Calculate total payments
  SELECT COALESCE(SUM(COALESCE(amount, 0)), 0)::decimal(10,2)
  INTO total_payments 
  FROM payments 
  WHERE worker_id = worker_uuid
    AND amount IS NOT NULL
    AND amount > 0;
  
  -- Calculate final balance with proper decimal precision
  current_balance := opening_bal + total_wages - total_payments;
  
  -- Ensure we return exactly 2 decimal places
  RETURN ROUND(current_balance, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add a helper function to recalculate all worker balances (for verification)
CREATE OR REPLACE FUNCTION recalculate_all_worker_balances()
RETURNS TABLE(worker_id uuid, worker_name text, calculated_balance decimal(10,2)) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    calculate_worker_balance(w.id) as balance
  FROM workers w
  ORDER BY w.name;
END;
$$ LANGUAGE plpgsql;

-- Ensure all numeric columns have proper constraints and defaults
DO $$
BEGIN
  -- Update workers table to ensure opening_balance is never null
  UPDATE workers SET opening_balance = 0 WHERE opening_balance IS NULL;
  
  -- Update attendance_records to ensure amount is 0 for absent status
  UPDATE attendance_records SET amount = 0 WHERE status = 'absent' AND amount IS NOT NULL;
  
  -- Ensure no negative amounts in payments (should be caught by constraint but double-check)
  UPDATE payments SET amount = ABS(amount) WHERE amount < 0;
END $$;

-- Add additional constraints to ensure data integrity
ALTER TABLE workers 
  ALTER COLUMN opening_balance SET DEFAULT 0,
  ALTER COLUMN opening_balance SET NOT NULL;

-- Add constraint to ensure attendance amounts are null or 0 for absent status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'attendance_amount_absent_check'
  ) THEN
    ALTER TABLE attendance_records 
    ADD CONSTRAINT attendance_amount_absent_check 
    CHECK (
      (status = 'absent' AND (amount IS NULL OR amount = 0)) OR 
      (status IN ('present', 'halfday'))
    );
  END IF;
END $$;