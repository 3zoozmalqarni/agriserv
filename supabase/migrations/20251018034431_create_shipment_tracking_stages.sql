/*
  # إنشاء جدول حالة مراحل تتبع الإرساليات

  1. الجداول الجديدة
    - `shipment_tracking_stages`
      - `id` (uuid, primary key)
      - `procedure_number` (text, unique) - رقم الإجراء
      - `paper_reception` (text) - حالة استلام الأوراق
      - `inspection_sampling` (text) - حالة الكشف وسحب العينات
      - `lab_testing` (text) - حالة الفحص المخبري
      - `clearance_procedures` (text) - حالة انهاء إجراءات الفسح
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على الجدول
    - السماح للمستخدمين المصادق عليهم بالقراءة
    - السماح للمستخدمين المصادق عليهم بالإدراج والتحديث
*/

CREATE TABLE IF NOT EXISTS shipment_tracking_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_number text UNIQUE NOT NULL,
  paper_reception text DEFAULT 'pending' CHECK (paper_reception IN ('pending', 'in_progress', 'completed')),
  inspection_sampling text DEFAULT 'pending' CHECK (inspection_sampling IN ('pending', 'in_progress', 'completed')),
  lab_testing text DEFAULT 'pending' CHECK (lab_testing IN ('pending', 'in_progress', 'completed')),
  clearance_procedures text DEFAULT 'pending' CHECK (clearance_procedures IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shipment_tracking_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tracking stages"
  ON shipment_tracking_stages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert tracking stages"
  ON shipment_tracking_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tracking stages"
  ON shipment_tracking_stages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shipment_tracking_procedure_number 
  ON shipment_tracking_stages(procedure_number);