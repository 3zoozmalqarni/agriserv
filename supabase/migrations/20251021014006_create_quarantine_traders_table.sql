/*
  # Create Quarantine Traders Table

  1. New Tables
    - `quarantine_traders`
      - `id` (uuid, primary key)
      - `shipment_id` (text) - رقم الإجراء البيطري
      - `importer_name` (text) - اسم المستورد
      - `permit_number` (text) - رقم الإذن
      - `statement_number` (text) - رقم البيان
      - `animal_count` (text) - عدد الحيوانات
      - `animal_type` (text) - نوع الحيوان
      - `quarantine_location` (text) - مكان الحجر
      - `clearance_status` (text) - حالة الفسح
      - `clearance_status_custom` (text, optional) - نص مخصص لحالة الفسح
      - `created_at` (timestamptz) - تاريخ الإنشاء
      - `updated_at` (timestamptz) - تاريخ آخر تحديث

  2. Security
    - Enable RLS on `quarantine_traders` table
    - Add policies for authenticated users to manage their data
*/

CREATE TABLE IF NOT EXISTS quarantine_traders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  importer_name text NOT NULL,
  permit_number text NOT NULL,
  statement_number text NOT NULL,
  animal_count text NOT NULL,
  animal_type text NOT NULL,
  quarantine_location text NOT NULL,
  clearance_status text NOT NULL,
  clearance_status_custom text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quarantine_traders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
  ON quarantine_traders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);