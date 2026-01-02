/*
  # Create vet importers table

  1. New Tables
    - `vet_importers`
      - `id` (uuid, primary key) - معرف فريد
      - `importer_name` (text, not null) - اسم المستورد
      - `farm_location` (text) - موقع المزرعة
      - `phone_number` (text) - رقم الجوال
      - `technical_report_expiry_date` (date) - تاريخ انتهاء التقرير الفني
      - `notes` (text) - ملاحظات
      - `status` (text, not null, default 'نشط') - الحالة (نشط/غير نشط)
      - `created_at` (timestamptz) - وقت الإنشاء
      - `updated_at` (timestamptz) - وقت آخر تحديث

  2. Security
    - Enable RLS on `vet_importers` table
    - Add policy for authenticated users to read all importers
    - Add policy for authenticated users to insert importers
    - Add policy for authenticated users to update importers
    - Add policy for authenticated users to delete importers
*/

CREATE TABLE IF NOT EXISTS vet_importers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importer_name text NOT NULL,
  farm_location text,
  phone_number text,
  technical_report_expiry_date date,
  notes text,
  status text NOT NULL DEFAULT 'نشط',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vet_importers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all importers"
  ON vet_importers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert importers"
  ON vet_importers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update importers"
  ON vet_importers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete importers"
  ON vet_importers
  FOR DELETE
  TO authenticated
  USING (true);