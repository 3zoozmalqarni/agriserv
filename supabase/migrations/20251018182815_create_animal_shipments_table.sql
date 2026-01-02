/*
  # إنشاء جدول الإرساليات الحيوانية

  1. الجداول الجديدة
    - `animal_shipments`
      - `id` (uuid, primary key)
      - `procedure_number` (text) - رقم الإجراء
      - `animal_type` (text) - نوع الحيوان
      - `animal_count` (integer) - عدد الحيوانات
      - `animal_gender` (text) - جنس الحيوان
      - `destination` (text) - الوجهة
      - `shipping_date` (text) - تاريخ الشحن
      - `clearance_complete` (boolean) - إكمال الفسح
      - `lab_results_status` (text) - حالة النتائج المخبرية
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على الجدول
    - السماح للمستخدمين المصادق عليهم بجميع العمليات
*/

CREATE TABLE IF NOT EXISTS animal_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_number text NOT NULL,
  animal_type text NOT NULL,
  animal_count integer NOT NULL,
  animal_gender text NOT NULL,
  destination text NOT NULL,
  shipping_date text NOT NULL,
  clearance_complete boolean DEFAULT false,
  lab_results_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE animal_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read animal shipments"
  ON animal_shipments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert animal shipments"
  ON animal_shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update animal shipments"
  ON animal_shipments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete animal shipments"
  ON animal_shipments
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_animal_shipments_procedure_number 
  ON animal_shipments(procedure_number);

CREATE INDEX IF NOT EXISTS idx_animal_shipments_created_at 
  ON animal_shipments(created_at DESC);