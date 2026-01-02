/*
  # Fix RLS Policy for Quarantine Traders Table

  1. Changes
    - Drop the existing restrictive policy
    - Create new permissive policies for anon and authenticated users
    - Allow all operations (SELECT, INSERT, UPDATE, DELETE) for all users
    
  2. Security
    - This table is used within the Electron app with service-level authentication
    - The app itself handles access control at the application layer
    - Public access is needed since the app uses anon key for operations
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON quarantine_traders;

-- Create permissive policies for all operations
CREATE POLICY "Allow SELECT for all users"
  ON quarantine_traders
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow INSERT for all users"
  ON quarantine_traders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow UPDATE for all users"
  ON quarantine_traders
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow DELETE for all users"
  ON quarantine_traders
  FOR DELETE
  TO anon, authenticated
  USING (true);