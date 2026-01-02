-- Create shipment ratings table
-- 1. New Tables
--    - shipment_ratings
--      - id (uuid, primary key)
--      - procedure_number (text, not null)
--      - service_satisfaction (integer, 1-5)
--      - experience_satisfaction (integer, 1-5)
--      - transaction_completion (integer, 1-5)
--      - procedures_clarity (integer, 1-5)
--      - comment (text, nullable)
--      - created_at (timestamptz)
--      - updated_at (timestamptz)
-- 2. Security
--    - Enable RLS on shipment_ratings table
--    - Add policy for anyone to read ratings
--    - Add policy for anyone to insert ratings

CREATE TABLE IF NOT EXISTS shipment_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_number text NOT NULL,
  service_satisfaction integer CHECK (service_satisfaction >= 1 AND service_satisfaction <= 5),
  experience_satisfaction integer CHECK (experience_satisfaction >= 1 AND experience_satisfaction <= 5),
  transaction_completion integer CHECK (transaction_completion >= 1 AND transaction_completion <= 5),
  procedures_clarity integer CHECK (procedures_clarity >= 1 AND procedures_clarity <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shipment_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings"
  ON shipment_ratings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert ratings"
  ON shipment_ratings
  FOR INSERT
  TO public
  WITH CHECK (true);
